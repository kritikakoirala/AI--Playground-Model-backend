// models.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class ModelsService {

  // Headers for the openrouterapi
  private readonly headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  /**
   * 
   * @param model The model we are getting the data about
   * @param prompt The prompt the user inputs
   * @param onData When the data is being spitted out
   * @param onComplete When the data is done being spitted out
   * @param onError When there is error during the flow
   */
  async streamModel(
    model: string,
    prompt: string,
    onData: (chunk: string) => void,
    onComplete: (metrics: {
      startTime: number;
      endTime: number;
      tokensUsed: number;
      costUSD: number;
    }) => void,
    onError: (err: Error) => void,
  ) {
    const startTime = Date.now();

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        }),
      });

      // Error handling for when the api connection doesn't work
      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`Failed to connect to model: ${model} - ${errorText}`);
      } else if (response.status === 429) {
        const errorText = await response.text();
        throw new Error(`Rate limited for model ${model}: ${errorText}`);
      }

      // This is to parse the data that is being thrown out in chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const jsonStr = line.replace('data: ', '').trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const json = JSON.parse(jsonStr);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                onData(content);
              }
            } catch (err) {
              console.error(`Failed to parse stream chunk from ${model}:`, jsonStr);
            }
          }
        }
      }

      const endTime = Date.now();
      const tokensUsed = Math.round(fullText.split(' ').length / 0.75);
      const costUSD = this.estimateCost(model, tokensUsed);

      onComplete({
        startTime,
        endTime,
        tokensUsed,
        costUSD,
      });
    } catch (err) {
      onError(new Error('Rate limit exceeded. Either Change the model or try with different prompt.'));
    }
  }

  // Function to calculate the estimated cost taken for the whole process
  estimateCost(model: string, tokens: number): number {
    const costPer1K: Record<string, number> = {
      'mistralai/mixtral-8x7b-instruct': 0.25 / 1000,
      'meta-llama/llama-3-8b-instruct': 0.60 / 1000,
    };
    const rate = costPer1K[model] ?? 0.001;
    return parseFloat((tokens * rate).toFixed(6));
  }
}

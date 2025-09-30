import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
// import { Session, SessionDocument } from './session.schema';
import { Model } from 'mongoose';
import { ModelsService } from '../models/models.service';
import { Session, SessionDocument } from 'src/schema/SessionSchema';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
    private readonly modelsService: ModelsService,
  ) {}

  async createSession(prompt: string) {
    const models = [
      "mistralai/mixtral-8x7b-instruct",
      "meta-llama/llama-3-8b-instruct",
    ];

    const statusPerModel = {};
    const responsePerModel = {};
    for (const model of models) {
      statusPerModel[model] = 'pending';
      responsePerModel[model] = '';
    }

    const session = new this.sessionModel({
      prompt,
      models,
      status: 'pending',
      statusPerModel,
      responsePerModel,
      createdAt: new Date(),
    });

    return session.save();
  }

  async getSession(id: string) {
    return this.sessionModel.findById(id);
  }

 async listSessions() {
  // Select only the fields you want to return for the list view
  return this.sessionModel.find({}, 'prompt createdAt status').sort({ createdAt: -1 });
}

  // session.service.ts
async startModelStreams(
  sessionId: string,
  sendToClient: (data: { model: string; chunk: string, }) => void,
    sendErrorToClient: (errorData: { model: string; message: string }) => void,

) {
  const session = await this.sessionModel.findById(sessionId);
  if (!session) throw new Error('Session not found');

  const models = session.models || [];
  const modelResults: Record<string, string> = {};
  const metricsPerModel: Record<string, { tokens: number; durationMs: number, cost:number }> = {};

  for (const model of models) {
    modelResults[model] = '';
  }

  await Promise.all(
    models.map(async (model) => {
      const startTime = Date.now();
      let tokenCount = 0;


      try {
        await this.modelsService.streamModel(
          model,
          session.prompt,
          (chunk) => {
            // Approximate token count: count spaces + 1
            tokenCount += chunk.trim().split(/\s+/).length;
            modelResults[model] += chunk;
            sendToClient({ model, chunk });
          },
          async (metrics) => {
            let {startTime, endTime, tokensUsed, costUSD} = metrics
            let duration = endTime - startTime
              // let duration
              metricsPerModel[model] = {tokens:tokensUsed, durationMs:duration, cost:costUSD};

            // const duration = Date.now() - startTime;
            // metricsPerModel[model] = { tokens: tokenCount, durationMs: duration, cost:this.modelsService.estimateCost(model, tokenCount), };

            await this.sessionModel.findByIdAndUpdate(sessionId, {
              $set: {
                [`responsePerModel.${model}`]: modelResults[model],
                [`statusPerModel.${model}`]: 'completed',
                [`metricsPerModel.${model}`]: metricsPerModel[model],
              },
            });
          },
          async (err) => {
            console.error(`Error streaming ${model}:`, err);
            await this.sessionModel.findByIdAndUpdate(sessionId, {
              $set: {
                [`statusPerModel.${model}`]: 'error',
              },
            });
            sendErrorToClient({ model, message: err.message });

          },
        );
      } catch (err) {

        console.error(`Unexpected error for model ${model}:`, err);

       
        await this.sessionModel.findByIdAndUpdate(sessionId, {
          $set: {
            [`statusPerModel.${model}`]: 'error',
          },
        });

        sendErrorToClient({ model, message: err.message });


      }
    }),
  );

  // Once all models finished (completed or errored), update overall session status
  await this.sessionModel.findByIdAndUpdate(sessionId, {
    $set: { status: 'completed' },
  });
}

}

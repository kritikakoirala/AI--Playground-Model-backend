import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Response } from 'express';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async createSession(@Body('prompt') prompt: string) {

  //    if (!prompt ||  prompt === '') {
  //   throw new BadRequestException('Prompt cannot be empty');
  // }

    const session = await this.sessionsService.createSession(prompt);
    return { sessionId: session._id };
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.sessionsService.getSession(id);
  }

  @Get()
  async listSessions() {
    return this.sessionsService.listSessions();
  }

  @Get('stream/:id')
  async stream(@Param('id') id: string, @Res({ passthrough: true }) res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendToClient = (data: { model: string; chunk: string }) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };


  // Wrap error sending function
  const sendErrorToClient = (errorData: { model: string; message: string }) => {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
  };

  try {
    await this.sessionsService.startModelStreams(id, sendToClient, sendErrorToClient);
  } catch (err) {
    // If you want to handle any top-level error here
    sendErrorToClient({ model: 'general', message: (err as Error).message });
  }
  
  const finalSession = await this.sessionsService.getSession(id);

  res.write(`event: metrics\n`);
  res.write(`data: ${JSON.stringify(finalSession?.metricsPerModel)}\n\n`);

  

  res.write('event: end\ndata: {}\n\n');
  res.end();



  }
}

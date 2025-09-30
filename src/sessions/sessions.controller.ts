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


  // The function is run when the user gives a prompt. Upon the prompt generation request, the session is created
  @Post()
  async createSession(@Body('prompt') prompt: string) {
    const session = await this.sessionsService.createSession(prompt);
    return { sessionId: session._id };
  }


  // Function to get details of single session
  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.sessionsService.getSession(id);
  }

  // Functions to get all sessions
  @Get()
  async listSessions() {
    return this.sessionsService.listSessions();
  }

  // Functions to get stream of a particular session.
  @Get('stream/:id')
  async stream(@Param('id') id: string, @Res({ passthrough: true }) res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // This is to send stream of chunks of data to frontend with swe
    const sendToClient = (data: { model: string; chunk: string }) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };


  // Wrap error sending function
  const sendErrorToClient = (errorData: { model: string; message: string }) => {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
  };

  // This function is the staring point to start the comparision of 2 models
  try {
    await this.sessionsService.startModelStreams(id, sendToClient, sendErrorToClient);
  } catch (err) {
    // If you want to handle any top-level error here
    sendErrorToClient({ model: 'general', message: (err as Error).message });
  }

  // This functions gives you the metrics of each model during the live stream passed to the frontend
  const finalSession = await this.sessionsService.getSession(id);
  res.write(`event: metrics\n`);
  res.write(`data: ${JSON.stringify(finalSession?.metricsPerModel)}\n\n`);

  res.write('event: end\ndata: {}\n\n');
  res.end();

  }
}

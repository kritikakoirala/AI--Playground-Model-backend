// SessionSchema.ts (example schema)
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Session {
  @Prop({ required: true })
  prompt: string;

  @Prop({ type: [String] })
  models: string[];

  @Prop({ default: 'pending' })
  status: string;

  @Prop({ type: Map, of: String, default: {} })
  statusPerModel: Record<string, string>;

  @Prop({ type: Map, of: String, default: {} })
  responsePerModel: Record<string, string>;

  @Prop({ type: Map, of: Object, default: {} })
  metricsPerModel: Record<
    string,
    {
      durationMs: number;
      tokensUsed: number;
      costUSD: number;
      startTime?: Date;
      endTime?: Date;
    }
  >;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export type SessionDocument = Session & Document;
export const SessionSchema = SchemaFactory.createForClass(Session);

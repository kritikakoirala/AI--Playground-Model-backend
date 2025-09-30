import { forwardRef, Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from 'src/schema/SessionSchema';
import { ModelsModule } from 'src/models/models.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    forwardRef(() => ModelsModule),
  ],

  providers: [SessionsService],
  controllers: [SessionsController],
  exports:[SessionsService]
})
export class SessionsModule {}

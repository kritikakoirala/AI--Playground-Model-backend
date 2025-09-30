import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionsModule } from './sessions/sessions.module';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from './schema/SessionSchema';
import { ModelsService } from './models/models.service';
import { ModelsModule } from './models/models.module';
import * as dotenv from 'dotenv';
dotenv.config();

console.log(process.env.BACKEND_API_URL)

@Module({
  imports: [SessionsModule, 

    MongooseModule.forRoot(`${process.env.MONGODB_URI}`), 
     MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    ModelsModule,
    SessionsModule 
  ],
  controllers: [AppController, SessionsController],
  providers: [AppService, SessionsService, ModelsService],
})
export class AppModule {}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
   app.enableCors({
    origin: [
      // 'http://localhost:3001',
      'https://ai-playground-model-frontend.vercel.app/'
    ],  
    methods:'GET,HEAD,PUT,POST,PATCH,DELETE',

    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

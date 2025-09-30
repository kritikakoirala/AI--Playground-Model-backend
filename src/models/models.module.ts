import { forwardRef, Module } from '@nestjs/common';
import { ModelsService } from './models.service';
import { SessionsModule } from 'src/sessions/sessions.module';

@Module({
  imports: [forwardRef(() => SessionsModule)],
  providers: [ModelsService],
  exports:[ModelsService]
})
export class ModelsModule {}

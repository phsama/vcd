import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ContentModule } from '../content/content.module';
import { StaffAuthModule } from '../admin/auth/staff-auth.module';
import { QueuesModule } from './queues.module';
import { LlmService } from './llm.service';
import { GenerationService } from './generation.service';
import { GenerationProcessor } from './generation.processor';
import { TtsProcessor } from './tts.processor';
import { PublishingService } from './publishing.service';
import { AdminPipelineController } from './admin-pipeline.controller';

@Module({
  imports: [ScheduleModule.forRoot(), QueuesModule, ContentModule, StaffAuthModule],
  controllers: [AdminPipelineController],
  providers: [LlmService, GenerationService, GenerationProcessor, TtsProcessor, PublishingService],
})
export class PipelineModule {}

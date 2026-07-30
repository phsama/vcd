import { Module } from '@nestjs/common';
import { StaffAuthModule } from '../admin/auth/staff-auth.module';
import { QueuesModule } from '../pipeline/queues.module';
import { CurationService } from './curation.service';
import { AdminCurationController } from './admin-curation.controller';
import { AdminPromptsController } from './admin-prompts.controller';
import { AdminCalendarController } from './admin-calendar.controller';
import { ReflectionsController } from './reflections.controller';

@Module({
  imports: [StaffAuthModule, QueuesModule],
  controllers: [
    AdminCurationController,
    AdminPromptsController,
    AdminCalendarController,
    ReflectionsController,
  ],
  providers: [CurationService],
  exports: [CurationService],
})
export class ContentModule {}

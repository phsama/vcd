import { Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, StaffAuthGuard } from '../admin/auth/staff-auth.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { GenerationService } from './generation.service';
import { PublishingService } from './publishing.service';

@ApiTags('admin')
@ApiBearerAuth('staff')
@UseGuards(StaffAuthGuard)
@UseInterceptors(AuditInterceptor)
@Roles('admin', 'curator')
@Controller('admin/pipeline')
export class AdminPipelineController {
  constructor(
    private readonly generation: GenerationService,
    private readonly publishing: PublishingService,
  ) {}

  @Post('generate-now')
  @ApiOperation({ summary: 'Dispara geração imediata (slots D+0..D+3 + variantes)' })
  generateNow() {
    return this.generation.ensureSlotsAndGenerate(3);
  }

  @Post('publish-due')
  @ApiOperation({ summary: 'Publica agora tudo que está agendado e vencido' })
  publishDue() {
    return this.publishing.publishDue();
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurationStatus } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { Roles, StaffAuthGuard, StaffRequest } from '../admin/auth/staff-auth.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { CurationService } from './curation.service';

class EditVariantDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @IsString()
  citationSource?: string;

  @IsOptional()
  @IsString()
  curatorNotes?: string;
}

class NotesDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('admin')
@ApiBearerAuth('staff')
@UseGuards(StaffAuthGuard)
@UseInterceptors(AuditInterceptor)
@Roles('admin', 'curator')
@Controller('admin/curation')
export class AdminCurationController {
  constructor(private readonly curation: CurationService) {}

  @Get('queue')
  @ApiOperation({ summary: 'Fila de curadoria (default: in_review + needs_changes)' })
  queue(
    @Query('status') status?: CurationStatus,
    @Query('trackId') trackId?: string,
    @Query('language') language?: string,
  ) {
    return this.curation.listQueue({ status, trackId, language });
  }

  @Get('variants/:id')
  variant(@Param('id') id: string) {
    return this.curation.getVariant(id);
  }

  @Patch('variants/:id')
  @ApiOperation({ summary: 'Edita texto/citação (mudar citação invalida a verificação)' })
  edit(@Param('id') id: string, @Req() req: StaffRequest, @Body() dto: EditVariantDto) {
    return this.curation.editVariant(id, req.staff.sub, dto);
  }

  @Post('variants/:id/verify-citation')
  @ApiOperation({ summary: 'Registra verificação humana da citação religiosa (Apple 1.1.5)' })
  verifyCitation(@Param('id') id: string, @Req() req: StaffRequest) {
    return this.curation.verifyCitation(id, req.staff.sub);
  }

  @Post('variants/:id/approve')
  @ApiOperation({ summary: 'Aprova (falha 422 se houver citação não verificada) e enfileira TTS' })
  approve(@Param('id') id: string, @Req() req: StaffRequest) {
    return this.curation.approve(id, req.staff.sub);
  }

  @Post('variants/:id/reject')
  reject(@Param('id') id: string, @Req() req: StaffRequest, @Body() dto: NotesDto) {
    return this.curation.reject(id, req.staff.sub, dto.notes);
  }

  @Post('variants/:id/request-changes')
  requestChanges(@Param('id') id: string, @Req() req: StaffRequest, @Body() dto: NotesDto) {
    return this.curation.requestChanges(id, req.staff.sub, dto.notes);
  }

  @Post('variants/:id/resubmit')
  resubmit(@Param('id') id: string, @Req() req: StaffRequest) {
    return this.curation.resubmit(id, req.staff.sub);
  }
}

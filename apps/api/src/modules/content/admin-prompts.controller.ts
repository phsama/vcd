import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Roles, StaffAuthGuard } from '../admin/auth/staff-auth.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { PrismaService } from '../../database/prisma.service';

class CreatePromptDto {
  @IsString()
  key: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  trackId?: string;

  @IsOptional()
  @IsString()
  slotId?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdatePromptDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('admin')
@ApiBearerAuth('staff')
@UseGuards(StaffAuthGuard)
@UseInterceptors(AuditInterceptor)
@Roles('admin', 'curator')
@Controller('admin/prompts')
export class AdminPromptsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.prompt.findMany({
      include: { track: true, slot: true },
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
    });
  }

  @Post()
  async create(@Body() dto: CreatePromptDto) {
    // Nova versão se a key já existe (prompts são versionados, nunca sobrescritos).
    const latest = await this.prisma.prompt.findFirst({
      where: { key: dto.key },
      orderBy: { version: 'desc' },
    });
    return this.prisma.prompt.create({
      data: {
        ...dto,
        language: dto.language as never,
        version: (latest?.version ?? 0) + 1,
      },
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromptDto) {
    return this.prisma.prompt.update({ where: { id }, data: dto });
  }
}

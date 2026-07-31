import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../database/prisma.service';

class JoinWaitlistDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  trackKey?: string;

  @IsOptional()
  @IsIn(['pt-BR', 'en'])
  locale?: string;
}

@ApiTags('waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Entra na lista de espera do lançamento (idempotente por email)' })
  async join(@Body() dto: JoinWaitlistDto) {
    await this.prisma.waitlistSignup.upsert({
      where: { email: dto.email.toLowerCase() },
      update: {},
      create: {
        email: dto.email.toLowerCase(),
        trackKey: dto.trackKey,
        locale: dto.locale ?? 'pt-BR',
      },
    });
    return { ok: true };
  }
}

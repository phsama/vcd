import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsentPurposeKey } from '@prisma/client';
import { IsBoolean, IsEnum } from 'class-validator';
import { UserAuthGuard, UserRequest } from '../auth/user-auth.guard';
import { ConsentsService } from './consents.service';

class SetConsentDto {
  @IsEnum(ConsentPurposeKey)
  purposeKey: ConsentPurposeKey;

  @IsBoolean()
  granted: boolean;
}

@ApiTags('consents')
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  @Get('purposes')
  @ApiOperation({ summary: 'Finalidades com versão vigente e textos (público, p/ onboarding)' })
  purposes() {
    return this.consents.listPurposes();
  }

  @Post()
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user')
  @ApiOperation({ summary: 'Concede ou revoga uma finalidade (linha append-only)' })
  set(@Req() req: UserRequest, @Body() dto: SetConsentDto) {
    return this.consents.setConsent(req.userId, dto.purposeKey, dto.granted, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('me')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user')
  @ApiOperation({ summary: 'Estado vigente por finalidade' })
  state(@Req() req: UserRequest) {
    return this.consents.currentState(req.userId);
  }

  @Get('me/history')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user')
  @ApiOperation({ summary: 'Histórico completo (trilha de auditoria)' })
  history(@Req() req: UserRequest) {
    return this.consents.history(req.userId);
  }
}

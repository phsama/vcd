import { Body, Controller, Delete, Get, Patch, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserAuthGuard, UserRequest } from '../auth/user-auth.guard';
import { UsersService } from './users.service';

class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsIn(['pt_BR', 'en'])
  language?: 'pt_BR' | 'en';

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

class SetTrackDto {
  @IsString()
  trackKey: string;
}

@ApiTags('me')
@ApiBearerAuth('user')
@UseGuards(UserAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@Req() req: UserRequest) {
    return this.users.getProfile(req.userId);
  }

  @Patch()
  update(@Req() req: UserRequest, @Body() dto: UpdateMeDto) {
    return this.users.updateProfile(req.userId, dto);
  }

  @Put('track')
  @ApiOperation({ summary: 'Troca de trilha espiritual (livre, a qualquer momento)' })
  setTrack(@Req() req: UserRequest, @Body() dto: SetTrackDto) {
    return this.users.setTrack(req.userId, dto.trackKey);
  }

  @Delete()
  @ApiOperation({ summary: 'Exclusão de conta in-app (Apple 5.1.1(v)) — purga após 7 dias' })
  requestDeletion(@Req() req: UserRequest) {
    return this.users.requestDeletion(req.userId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Portabilidade LGPD — exportação JSON dos dados do titular' })
  export(@Req() req: UserRequest) {
    return this.users.exportData(req.userId);
  }
}

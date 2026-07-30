import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { StaffAuthService } from './staff-auth.service';

class StaffLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

@ApiTags('admin')
@Controller('admin/auth')
export class StaffAuthController {
  constructor(private readonly service: StaffAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login de staff (JWT com audience staff)' })
  login(@Body() dto: StaffLoginDto) {
    return this.service.login(dto.email, dto.password);
  }
}

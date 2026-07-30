import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuthService } from './auth.service';
import { SocialVerifyService } from './social-verify.service';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName: string;

  @IsOptional()
  @IsIn(['pt_BR', 'en'])
  language?: 'pt_BR' | 'en';

  @IsOptional()
  @IsString()
  trackKey?: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

class RefreshDto {
  @IsString()
  refreshToken: string;
}

class GoogleLoginDto {
  @IsString()
  idToken: string;

  @IsOptional()
  @IsIn(['pt_BR', 'en'])
  language?: 'pt_BR' | 'en';

  @IsOptional()
  @IsString()
  trackKey?: string;
}

class AppleLoginDto {
  @IsString()
  identityToken: string;

  @IsOptional()
  @IsString()
  displayName?: string; // Apple só envia o nome no primeiro login, via app

  @IsOptional()
  @IsIn(['pt_BR', 'en'])
  language?: 'pt_BR' | 'en';

  @IsOptional()
  @IsString()
  trackKey?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly social: SocialVerifyService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Cadastro com email e senha' })
  register(@Body() dto: RegisterDto) {
    return this.auth.registerWithEmail(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login com email e senha' })
  login(@Body() dto: LoginDto) {
    return this.auth.loginWithEmail(dto.email, dto.password);
  }

  @Post('google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login com Google (ID token verificado via JWKS)' })
  async google(@Body() dto: GoogleLoginDto) {
    const identity = await this.social.verifyGoogle(dto.idToken);
    return this.auth.loginWithSocial({
      provider: 'google',
      ...identity,
      language: dto.language,
      trackKey: dto.trackKey,
    });
  }

  @Post('apple')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with Apple (identity token verificado via JWKS)' })
  async apple(@Body() dto: AppleLoginDto) {
    const identity = await this.social.verifyApple(dto.identityToken);
    return this.auth.loginWithSocial({
      provider: 'apple',
      ...identity,
      displayName: dto.displayName ?? identity.displayName,
      language: dto.language,
      trackKey: dto.trackKey,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotaciona o refresh token (reuso revoga a família toda)' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoga a família do refresh token (idempotente)' })
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
  }
}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SocialVerifyService } from './social-verify.service';
import { UserAuthGuard } from './user-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: env.JWT_ACCESS_TTL as `${number}s`, audience: 'user' },
      verifyOptions: { audience: 'user' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SocialVerifyService, UserAuthGuard],
  exports: [UserAuthGuard, JwtModule, AuthService],
})
export class AuthModule {}

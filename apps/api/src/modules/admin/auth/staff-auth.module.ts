import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../../config/env';
import { StaffAuthController } from './staff-auth.controller';
import { StaffAuthService } from './staff-auth.service';
import { StaffAuthGuard } from './staff-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '8h', audience: 'staff' },
      verifyOptions: { audience: 'staff' },
    }),
  ],
  controllers: [StaffAuthController],
  providers: [StaffAuthService, StaffAuthGuard],
  exports: [StaffAuthGuard, JwtModule],
})
export class StaffAuthModule {}

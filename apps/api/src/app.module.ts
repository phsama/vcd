import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { env } from './config/env';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { TracksModule } from './modules/tracks/tracks.module';
import { AuditModule } from './modules/audit/audit.module';
import { StaffAuthModule } from './modules/admin/auth/staff-auth.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { UsersModule } from './modules/users/users.module';
import { ContentModule } from './modules/content/content.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';

const redisUrl = new URL(env.REDIS_URL);

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port || 6379),
      },
    }),
    PrismaModule,
    AuditModule,
    HealthModule,
    TracksModule,
    StaffAuthModule,
    AuthModule,
    ConsentsModule,
    UsersModule,
    ContentModule,
    PipelineModule,
    WaitlistModule,
  ],
})
export class AppModule {}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: {
    staffId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    targetUserId?: string;
    metadata?: Prisma.InputJsonValue;
    ip?: string;
  }) {
    await this.prisma.auditLog.create({ data: entry });
  }
}

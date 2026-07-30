import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, StaffAuthGuard } from '../admin/auth/staff-auth.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('admin')
@ApiBearerAuth('staff')
@UseGuards(StaffAuthGuard)
@UseInterceptors(AuditInterceptor)
@Roles('admin', 'curator')
@Controller('admin/calendar')
export class AdminCalendarController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Grade de publicação (dia × slot × trilha × idioma) com estados' })
  list(@Query('from') from?: string, @Query('to') to?: string) {
    const start = from ? new Date(from) : new Date();
    const end = to ? new Date(to) : new Date(Date.now() + 7 * 86_400_000);
    return this.prisma.publicationSlot.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        track: true,
        slot: true,
        variant: { select: { id: true, title: true, curationStatus: true } },
      },
      orderBy: [{ date: 'asc' }, { publishAt: 'asc' }],
    });
  }
}

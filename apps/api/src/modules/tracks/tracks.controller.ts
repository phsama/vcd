import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('tracks')
@Controller('tracks')
export class TracksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as trilhas espirituais ativas' })
  async list() {
    return this.prisma.track.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, key: true, namePt: true, nameEn: true },
    });
  }
}

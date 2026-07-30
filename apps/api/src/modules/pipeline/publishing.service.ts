import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { CurationService } from '../content/curation.service';

@Injectable()
export class PublishingService {
  private readonly logger = new Logger(PublishingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly curation: CurationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDue() {
    const due = await this.prisma.publicationSlot.findMany({
      where: {
        status: 'filled',
        publishAt: { lte: new Date() },
        variant: { curationStatus: 'scheduled' },
      },
      include: { variant: true },
    });

    for (const slot of due) {
      await this.curation.transition(slot.variantId!, 'pipeline', 'published');
      await this.prisma.publicationSlot.update({
        where: { id: slot.id },
        data: { status: 'published' },
      });
      // TODO(fase 5): invalidar cache Redis do /today + emitir evento SSE
      // TODO(fase 3): enfileirar push fan-out
      this.logger.log(`Publicada variante ${slot.variantId} (slot ${slot.id})`);
    }

    return { published: due.length };
  }
}

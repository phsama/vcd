import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { CurationService } from '../content/curation.service';
import { QUEUE_TTS } from './queues';

/**
 * v0: TTS stub — registra o asset e avança a state machine sem sintetizar áudio.
 * A implementação Google Cloud TTS entra quando houver credencial (mesma interface).
 */
@Processor(QUEUE_TTS)
export class TtsProcessor extends WorkerHost {
  private readonly logger = new Logger(TtsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly curation: CurationService,
  ) {
    super();
  }

  async process(job: Job<{ variantId: string }>) {
    const { variantId } = job.data;
    const variant = await this.prisma.reflectionVariant.findUniqueOrThrow({
      where: { id: variantId },
      include: { reflection: true },
    });

    await this.prisma.audioAsset.create({
      data: {
        variantId,
        r2Key: `audio/stub/${variantId}.m4a`,
        ttsProvider: 'stub',
        ttsVoice: 'stub',
        status: 'ready',
      },
    });
    await this.curation.transition(variantId, 'pipeline', 'audio_ready');

    // Vincula a variante à grade de publicação e agenda.
    const slot = await this.prisma.publicationSlot.findFirst({
      where: {
        trackId: variant.reflection.trackId,
        slotId: variant.reflection.slotId,
        date: variant.reflection.scheduledDate ?? undefined,
        language: variant.language,
        status: 'open',
      },
    });

    if (slot) {
      await this.prisma.publicationSlot.update({
        where: { id: slot.id },
        data: { variantId, status: 'filled' },
      });
      await this.curation.transition(variantId, 'pipeline', 'scheduled');
    } else {
      this.logger.warn(`Sem publication_slot aberto para variante ${variantId} — fica audio_ready`);
    }

    return { variantId, scheduled: Boolean(slot) };
  }
}

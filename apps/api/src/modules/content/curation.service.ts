import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { CurationStatus, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QUEUE_TTS } from '../pipeline/queues';

/** Transições permitidas da state machine de curadoria. */
const TRANSITIONS: Record<CurationStatus, CurationStatus[]> = {
  generated: ['in_review', 'archived'],
  in_review: ['needs_changes', 'rejected', 'approved'],
  needs_changes: ['in_review', 'rejected'],
  rejected: [],
  approved: ['audio_pending'],
  audio_pending: ['audio_ready', 'audio_failed'],
  audio_failed: ['audio_pending'],
  audio_ready: ['scheduled'],
  scheduled: ['published'],
  published: ['archived'],
  archived: [],
};

@Injectable()
export class CurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue(QUEUE_TTS) private readonly ttsQueue: Queue,
  ) {}

  listQueue(filters: { status?: CurationStatus; trackId?: string; language?: string }) {
    return this.prisma.reflectionVariant.findMany({
      where: {
        curationStatus: filters.status ?? { in: ['in_review', 'needs_changes'] },
        ...(filters.language ? { language: filters.language as never } : {}),
        ...(filters.trackId ? { reflection: { trackId: filters.trackId } } : {}),
      },
      include: {
        reflection: { include: { track: true, slot: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async getVariant(id: string) {
    const variant = await this.prisma.reflectionVariant.findUnique({
      where: { id },
      include: {
        reflection: { include: { track: true, slot: true } },
        audioAssets: true,
      },
    });
    if (!variant) throw new NotFoundException('Variante não encontrada');
    return variant;
  }

  async editVariant(
    id: string,
    staffId: string,
    data: { title?: string; bodyText?: string; citationSource?: string | null; curatorNotes?: string },
  ) {
    const variant = await this.getVariant(id);
    if (!(['in_review', 'needs_changes'] as CurationStatus[]).includes(variant.curationStatus)) {
      throw new BadRequestException('Só é possível editar variantes em revisão');
    }

    // Mudou a citação → invalida a verificação anterior (precisa verificar de novo).
    const citationChanged =
      data.citationSource !== undefined && data.citationSource !== variant.citationSource;

    return this.prisma.reflectionVariant.update({
      where: { id },
      data: {
        ...data,
        curatedById: staffId,
        ...(citationChanged
          ? { citationVerified: false, citationVerifiedById: null, citationVerifiedAt: null }
          : {}),
      },
    });
  }

  async verifyCitation(id: string, staffId: string) {
    const variant = await this.getVariant(id);
    if (!variant.citationSource) {
      throw new BadRequestException('Variante não tem citação para verificar');
    }
    return this.prisma.reflectionVariant.update({
      where: { id },
      data: {
        citationVerified: true,
        citationVerifiedById: staffId,
        citationVerifiedAt: new Date(),
      },
    });
  }

  async approve(id: string, staffId: string) {
    const variant = await this.getVariant(id);

    // GUARD DURO (Apple 1.1.5): citação presente exige verificação humana registrada.
    if (variant.citationSource && !variant.citationVerified) {
      throw new UnprocessableEntityException(
        'Citação religiosa não verificada — verifique a fonte antes de aprovar',
      );
    }

    await this.transition(id, staffId, 'approved');
    // Irmãs da mesma reflexão/idioma ainda em curadoria → arquivadas (reaproveitáveis).
    await this.prisma.reflectionVariant.updateMany({
      where: {
        reflectionId: variant.reflectionId,
        language: variant.language,
        id: { not: id },
        curationStatus: { in: ['generated', 'in_review', 'needs_changes'] },
      },
      data: { curationStatus: 'archived' },
    });

    const updated = await this.transition(id, staffId, 'audio_pending');
    await this.ttsQueue.add('generate-audio', { variantId: id });
    return updated;
  }

  async reject(id: string, staffId: string, notes?: string) {
    return this.transition(id, staffId, 'rejected', notes ? { curatorNotes: notes } : undefined);
  }

  async requestChanges(id: string, staffId: string, notes?: string) {
    return this.transition(
      id,
      staffId,
      'needs_changes',
      notes ? { curatorNotes: notes } : undefined,
    );
  }

  async resubmit(id: string, staffId: string) {
    return this.transition(id, staffId, 'in_review');
  }

  /** Única porta de mudança de status — valida a transição e grava auditoria. */
  async transition(
    id: string,
    actorId: string,
    to: CurationStatus,
    extra?: Prisma.ReflectionVariantUncheckedUpdateInput,
  ) {
    const variant = await this.prisma.reflectionVariant.findUnique({ where: { id } });
    if (!variant) throw new NotFoundException('Variante não encontrada');

    if (!TRANSITIONS[variant.curationStatus].includes(to)) {
      throw new BadRequestException(
        `Transição inválida: ${variant.curationStatus} → ${to}`,
      );
    }

    const updated = await this.prisma.reflectionVariant.update({
      where: { id },
      data: {
        curationStatus: to,
        ...(to === 'published' ? { publishedAt: new Date() } : {}),
        ...(actorId !== 'pipeline' ? { curatedById: actorId } : {}),
        ...extra,
      },
    });

    if (actorId !== 'pipeline') {
      await this.audit.log({
        staffId: actorId,
        action: `curation.transition:${variant.curationStatus}->${to}`,
        resourceType: 'ReflectionVariant',
        resourceId: id,
      });
    }

    return updated;
  }
}

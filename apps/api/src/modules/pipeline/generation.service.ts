import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Language } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LlmService } from './llm.service';

const VARIANTS_PER_SLOT = 3; // dev; produção usa 10 (ver plano)
const LANGUAGES: Language[] = ['pt_BR', 'en'];
const BRT_OFFSET_HOURS = 3; // simplificação v0: horários de slot em America/Sao_Paulo

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  /** Cron diário 03:00 BRT (06:00 UTC) — garante buffer de conteúdo D+3. */
  @Cron('0 6 * * *')
  dailyGenerate() {
    return this.ensureSlotsAndGenerate(3);
  }

  /** Garante publication_slots e variantes em curadoria para D+0..D+daysAhead. */
  async ensureSlotsAndGenerate(daysAhead = 3) {
    const tracks = await this.prisma.track.findMany({ where: { active: true } });
    const timeSlots = await this.prisma.timeSlot.findMany();
    let generated = 0;

    for (let d = 0; d <= daysAhead; d++) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() + d);

      for (const track of tracks) {
        for (const slot of timeSlots) {
          // 1 reflection por trilha × slot × data (compartilhada entre idiomas)
          let reflection = await this.prisma.reflection.findFirst({
            where: { trackId: track.id, slotId: slot.id, scheduledDate: date },
          });
          reflection ??= await this.prisma.reflection.create({
            data: { trackId: track.id, slotId: slot.id, scheduledDate: date },
          });

          for (const language of LANGUAGES) {
            const publishAt = this.combine(date, slot.defaultTime);
            await this.prisma.publicationSlot.upsert({
              where: {
                date_slotId_trackId_language: {
                  date,
                  slotId: slot.id,
                  trackId: track.id,
                  language,
                },
              },
              update: {},
              create: { date, slotId: slot.id, trackId: track.id, language, publishAt },
            });

            const existing = await this.prisma.reflectionVariant.count({
              where: { reflectionId: reflection.id, language },
            });
            if (existing > 0) continue;

            const prompt = await this.prisma.prompt.findFirst({
              where: {
                active: true,
                OR: [{ trackId: track.id }, { trackId: null }],
                AND: [{ OR: [{ language }, { language: null }] }],
              },
              orderBy: [{ trackId: 'desc' }, { version: 'desc' }],
            });

            const variants = await this.llm.generateVariants({
              trackKey: track.key,
              trackName: language === 'pt_BR' ? track.namePt : track.nameEn,
              slotKey: slot.key,
              language,
              count: VARIANTS_PER_SLOT,
              promptBody: prompt?.body,
            });

            const batchId = `${reflection.id}:${language}`;
            await this.prisma.reflectionVariant.createMany({
              data: variants.map((v, i) => ({
                reflectionId: reflection!.id,
                language,
                title: v.title,
                bodyText: v.bodyText,
                citationSource: v.citationSource,
                aiModel: v.aiModel,
                aiPromptId: prompt?.id,
                generationBatchId: batchId,
                generationIndex: i + 1,
                curationStatus: 'in_review', // pré-triagem automática entra depois
              })),
            });
            generated += variants.length;
          }
        }
      }
    }

    this.logger.log(`Geração concluída: ${generated} variantes novas`);
    return { generated };
  }

  /** "07:00" no dia D (BRT) → Date UTC. */
  private combine(date: Date, hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number);
    const result = new Date(date);
    result.setUTCHours(h + BRT_OFFSET_HOURS, m, 0, 0);
    return result;
  }
}

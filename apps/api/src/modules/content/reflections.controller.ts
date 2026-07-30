import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Language } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

function parseLanguage(raw?: string): Language {
  if (!raw || raw === 'pt-BR' || raw === 'pt_BR') return 'pt_BR';
  if (raw === 'en') return 'en';
  throw new BadRequestException('language deve ser pt-BR ou en');
}

@ApiTags('reflections')
@Controller('reflections')
export class ReflectionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('today')
  @ApiOperation({
    summary: 'Reflexão do momento (última publicada hoje para trilha+idioma)',
    description:
      'v0: trilha/idioma via query params. Quando o auth de usuário entrar (Fase 1), passam a vir do perfil.',
  })
  async today(@Query('track') track?: string, @Query('language') language?: string) {
    const lang = parseLanguage(language);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const slot = await this.prisma.publicationSlot.findFirst({
      where: {
        status: 'published',
        date: today,
        language: lang,
        publishAt: { lte: new Date() },
        ...(track ? { track: { key: track } } : {}),
      },
      orderBy: { publishAt: 'desc' },
      include: {
        track: { select: { key: true, namePt: true, nameEn: true } },
        slot: true,
        variant: {
          select: {
            id: true,
            title: true,
            bodyText: true,
            citationSource: true,
            isAiGenerated: true,
            publishedAt: true,
            audioAssets: { where: { status: 'ready' }, select: { r2Key: true, durationMs: true } },
          },
        },
      },
    });

    return slot ?? { message: 'Nenhuma reflexão publicada hoje para esse filtro' };
  }
}

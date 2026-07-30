import { Injectable, Logger } from '@nestjs/common';
import { Language } from '@prisma/client';
import { env } from '../../config/env';

export interface GeneratedVariant {
  title: string;
  bodyText: string;
  citationSource?: string;
  aiModel: string;
}

/**
 * Geração de variantes de reflexão.
 * Com ANTHROPIC_API_KEY: chama a API da Anthropic (Claude Haiku).
 * Sem chave (dev): gerador determinístico — mantém o fluxo completo testável.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  async generateVariants(params: {
    trackKey: string;
    trackName: string;
    slotKey: string;
    language: Language;
    count: number;
    promptBody?: string;
  }): Promise<GeneratedVariant[]> {
    if (env.ANTHROPIC_API_KEY) {
      try {
        return await this.generateWithClaude(params);
      } catch (err) {
        this.logger.error(`Falha na geração via API, caindo para stub: ${String(err)}`);
      }
    }
    return this.generateStub(params);
  }

  private async generateWithClaude(params: {
    trackKey: string;
    trackName: string;
    slotKey: string;
    language: Language;
    count: number;
    promptBody?: string;
  }): Promise<GeneratedVariant[]> {
    const model = 'claude-haiku-4-5-20251001';
    const langLabel = params.language === 'pt_BR' ? 'português brasileiro' : 'English';
    const prompt =
      params.promptBody ??
      `Escreva ${params.count} reflexões espirituais curtas (150-250 palavras) para a trilha "${params.trackName}", momento "${params.slotKey}", em ${langLabel}. ` +
        `Tom acolhedor, não doutrinário. Se citar texto religioso/filosófico, indique a fonte exata. ` +
        `Responda APENAS com JSON: [{"title": "...", "bodyText": "...", "citationSource": "... ou null"}]`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    const text = data.content.find((c) => c.type === 'text')?.text ?? '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? '[]') as Array<{
      title: string;
      bodyText: string;
      citationSource?: string | null;
    }>;

    return parsed.slice(0, params.count).map((v) => ({
      title: v.title,
      bodyText: v.bodyText,
      citationSource: v.citationSource ?? undefined,
      aiModel: model,
    }));
  }

  private generateStub(params: {
    trackKey: string;
    trackName: string;
    slotKey: string;
    language: Language;
    count: number;
  }): GeneratedVariant[] {
    const pt = params.language === 'pt_BR';
    const citations: Record<string, string> = {
      catolica: 'Mateus 11:28',
      evangelica: 'Salmos 46:1',
      espirita: 'O Evangelho Segundo o Espiritismo, cap. V',
      filosofica: 'Meditações, Marco Aurélio, Livro II',
      buscador: '',
    };

    return Array.from({ length: params.count }, (_, i) => {
      const withCitation = i === 0 && citations[params.trackKey];
      return {
        title: pt
          ? `[STUB ${i + 1}] Reflexão da ${params.slotKey} — ${params.trackName}`
          : `[STUB ${i + 1}] ${params.slotKey} reflection — ${params.trackName}`,
        bodyText: pt
          ? `(Conteúdo de desenvolvimento, variante ${i + 1}.) Respire fundo. Este momento de ${params.slotKey} é um convite a olhar para dentro na perspectiva ${params.trackName.toLowerCase()}. O que hoje pede de você: presença, gratidão e um passo pequeno na direção do que importa.`
          : `(Development content, variant ${i + 1}.) Take a deep breath. This ${params.slotKey} moment is an invitation to look inward from the ${params.trackName} perspective. What today asks of you: presence, gratitude, and one small step toward what matters.`,
        citationSource: withCitation ? citations[params.trackKey] : undefined,
        aiModel: 'stub-dev',
      };
    });
  }
}

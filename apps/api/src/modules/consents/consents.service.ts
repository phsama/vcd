import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConsentPurposeKey } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConsentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Finalidades com a versão vigente e os textos exatos exibidos ao usuário. */
  async listPurposes() {
    const purposes = await this.prisma.consentPurpose.findMany({
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    return purposes.map((p) => ({
      key: p.key,
      version: p.versions[0]?.version ?? null,
      textPt: p.versions[0]?.textPt ?? null,
      textEn: p.versions[0]?.textEn ?? null,
    }));
  }

  /** Append-only: conceder ou revogar é sempre uma linha nova (prova LGPD art. 8º). */
  async setConsent(
    userId: string,
    purposeKey: ConsentPurposeKey,
    granted: boolean,
    context: { ip?: string; userAgent?: string },
  ) {
    const purpose = await this.prisma.consentPurpose.findUnique({
      where: { key: purposeKey },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    const version = purpose?.versions[0];
    if (!version) throw new NotFoundException('Finalidade de consentimento não encontrada');

    return this.prisma.userConsent.create({
      data: {
        userId,
        consentVersionId: version.id,
        granted,
        ipHash: context.ip ? createHash('sha256').update(context.ip).digest('hex') : undefined,
        userAgent: context.userAgent?.slice(0, 255),
      },
      include: { consentVersion: { include: { purpose: true } } },
    });
  }

  /** Estado vigente = última linha por finalidade. */
  async currentState(userId: string): Promise<Record<string, boolean>> {
    const rows = await this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { consentVersion: { include: { purpose: true } } },
    });
    const state: Record<string, boolean> = {};
    for (const row of rows) {
      const key = row.consentVersion.purpose.key;
      if (!(key in state)) state[key] = row.granted;
    }
    return state;
  }

  async history(userId: string) {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { consentVersion: { include: { purpose: true } } },
    });
  }

  async hasConsent(userId: string, purposeKey: ConsentPurposeKey): Promise<boolean> {
    const state = await this.currentState(userId);
    return state[purposeKey] === true;
  }

  /** Guard de serviço: lança 403 se a finalidade não estiver consentida (LGPD art. 11). */
  async assertConsent(userId: string, purposeKey: ConsentPurposeKey): Promise<void> {
    if (!(await this.hasConsent(userId, purposeKey))) {
      throw new ForbiddenException(
        `Operação requer consentimento ativo para "${purposeKey}"`,
      );
    }
  }
}

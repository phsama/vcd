import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';

const PROFILE_SELECT = {
  id: true,
  email: true,
  displayName: true,
  handle: true,
  avatarUrl: true,
  language: true,
  timezone: true,
  status: true,
  premiumUntil: true,
  track: { select: { key: true, namePt: true, nameEn: true } },
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  updateProfile(
    userId: string,
    data: { displayName?: string; language?: 'pt_BR' | 'en'; timezone?: string; avatarUrl?: string },
  ) {
    return this.prisma.user.update({ where: { id: userId }, data, select: PROFILE_SELECT });
  }

  async setTrack(userId: string, trackKey: string) {
    const track = await this.prisma.track.findUnique({ where: { key: trackKey, active: true } });
    if (!track) throw new NotFoundException('Trilha não encontrada');
    return this.prisma.user.update({
      where: { id: userId },
      data: { trackId: track.id },
      select: PROFILE_SELECT,
    });
  }

  /**
   * Exclusão in-app (Apple 5.1.1(v)): marca a conta e revoga todas as sessões.
   * A purga definitiva (anonimização + remoção de conteúdo) roda no job da Fase 8,
   * após período de arrependimento de 7 dias.
   */
  async requestDeletion(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'deletion_requested', deletedAt: new Date() },
    });
    await this.prisma.dataSubjectRequest.create({
      data: { userId, type: 'deletion' },
    });
    await this.auth.revokeAllSessions(userId);
    return { status: 'deletion_requested', graceDays: 7 };
  }

  /** Portabilidade LGPD: exportação JSON dos dados do titular. */
  async exportData(userId: string) {
    const [profile, consents, checkins, comments, intentions] = await Promise.all([
      this.getProfile(userId),
      this.prisma.userConsent.findMany({
        where: { userId },
        include: { consentVersion: { include: { purpose: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.checkin.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
      this.prisma.comment.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.intention.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    ]);

    await this.prisma.dataSubjectRequest.create({
      data: { userId, type: 'portability', status: 'fulfilled', fulfilledAt: new Date() },
    });

    return {
      exportedAt: new Date().toISOString(),
      profile,
      consents: consents.map((c) => ({
        purpose: c.consentVersion.purpose.key,
        version: c.consentVersion.version,
        granted: c.granted,
        at: c.createdAt,
      })),
      checkins,
      comments,
      intentions,
      // journal: entra quando o módulo existir (Fase 4) — exportado decriptado para o titular
    };
  }
}

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { env } from '../../config/env';
import { PrismaService } from '../../database/prisma.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; displayName: string; handle: string; language: string; trackKey: string };
}

const DEFAULT_TRACK_KEY = 'buscador';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async registerWithEmail(input: {
    email: string;
    password: string;
    displayName: string;
    language?: 'pt_BR' | 'en';
    trackKey?: string;
  }): Promise<AuthTokens> {
    const existing = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUid: { provider: 'email', providerUid: input.email } },
    });
    if (existing) throw new ConflictException('Email já cadastrado');

    const user = await this.createUser({
      email: input.email,
      displayName: input.displayName,
      language: input.language,
      trackKey: input.trackKey,
      identity: {
        provider: 'email',
        providerUid: input.email,
        passwordHash: await argon2.hash(input.password),
      },
    });
    return this.issueTokens(user);
  }

  async loginWithEmail(email: string, password: string): Promise<AuthTokens> {
    const identity = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUid: { provider: 'email', providerUid: email } },
      include: { user: { include: { track: true } } },
    });
    if (!identity?.passwordHash) throw new UnauthorizedException('Credenciais inválidas');
    if (!(await argon2.verify(identity.passwordHash, password))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    this.assertActive(identity.user);
    return this.issueTokens(identity.user);
  }

  /** Find-or-create para login social (identidade já verificada pelo SocialVerifyService). */
  async loginWithSocial(input: {
    provider: Exclude<AuthProvider, 'email'>;
    providerUid: string;
    email?: string;
    displayName?: string;
    language?: 'pt_BR' | 'en';
    trackKey?: string;
  }): Promise<AuthTokens> {
    const identity = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUid: { provider: input.provider, providerUid: input.providerUid } },
      include: { user: true },
    });

    if (identity) {
      this.assertActive(identity.user);
      return this.issueTokens(identity.user);
    }

    const user = await this.createUser({
      email: input.email,
      displayName: input.displayName ?? 'Buscador(a)',
      language: input.language,
      trackKey: input.trackKey,
      identity: { provider: input.provider, providerUid: input.providerUid },
    });
    return this.issueTokens(user);
  }

  /** Rotação com detecção de reuso: refresh já revogado → revoga a família inteira. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Refresh token inválido');

    if (stored.revokedAt || stored.expiresAt < new Date()) {
      // Reuso de token rotacionado = possível roubo → derruba a família toda.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token expirado ou reutilizado');
    }

    this.assertActive(stored.user);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(stored.user, stored.familyId);
  }

  async logout(refreshToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
    });
    if (!stored) return; // logout é idempotente
    await this.prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private assertActive(user: User) {
    if (user.status === 'suspended') throw new UnauthorizedException('Conta suspensa');
    if (user.status === 'banned') throw new UnauthorizedException('Conta banida');
    if (user.status === 'deleted' || user.status === 'deletion_requested') {
      throw new UnauthorizedException('Conta em exclusão');
    }
  }

  private async createUser(input: {
    email?: string;
    displayName: string;
    language?: 'pt_BR' | 'en';
    trackKey?: string;
    identity: { provider: AuthProvider; providerUid: string; passwordHash?: string };
  }): Promise<User> {
    const track = await this.prisma.track.findUniqueOrThrow({
      where: { key: input.trackKey ?? DEFAULT_TRACK_KEY },
    });
    return this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        handle: await this.generateHandle(input.displayName),
        language: input.language ?? 'pt_BR',
        trackId: track.id,
        authIdentities: { create: input.identity },
      },
    });
  }

  private async generateHandle(displayName: string): Promise<string> {
    const base =
      displayName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 16) || 'buscador';
    for (let i = 0; i < 10; i++) {
      const candidate = `${base}${randomBytes(3).toString('hex')}`;
      const taken = await this.prisma.user.findUnique({ where: { handle: candidate } });
      if (!taken) return candidate;
    }
    return `${base}${randomUUID().slice(0, 8)}`;
  }

  private async issueTokens(user: User, familyId?: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: user.id });

    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        familyId: familyId ?? randomUUID(),
        expiresAt,
      },
    });

    const track = await this.prisma.track.findUniqueOrThrow({ where: { id: user.trackId } });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        displayName: user.displayName,
        handle: user.handle,
        language: user.language,
        trackKey: track.key,
      },
    };
  }
}

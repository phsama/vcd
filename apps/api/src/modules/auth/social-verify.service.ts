import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../../config/env';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export interface VerifiedSocialIdentity {
  providerUid: string;
  email?: string;
  displayName?: string;
}

/**
 * Verifica ID tokens de login social contra as JWKS públicas dos provedores.
 * Requer client IDs configurados (GOOGLE_OAUTH_CLIENT_ID / APPLE_BUNDLE_ID) —
 * sem eles a rota responde 503 explicando o que falta, em vez de aceitar às cegas.
 */
@Injectable()
export class SocialVerifyService {
  async verifyGoogle(idToken: string): Promise<VerifiedSocialIdentity> {
    if (!env.GOOGLE_OAUTH_CLIENT_ID) {
      throw new ServiceUnavailableException(
        'Login Google não configurado (GOOGLE_OAUTH_CLIENT_ID ausente)',
      );
    }
    try {
      const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: env.GOOGLE_OAUTH_CLIENT_ID,
      });
      return {
        providerUid: payload.sub!,
        email: payload.email as string | undefined,
        displayName: (payload.name as string | undefined) ?? undefined,
      };
    } catch {
      throw new UnauthorizedException('ID token do Google inválido');
    }
  }

  async verifyApple(identityToken: string): Promise<VerifiedSocialIdentity> {
    if (!env.APPLE_BUNDLE_ID) {
      throw new ServiceUnavailableException(
        'Sign in with Apple não configurado (APPLE_BUNDLE_ID ausente)',
      );
    }
    try {
      const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: 'https://appleid.apple.com',
        audience: env.APPLE_BUNDLE_ID,
      });
      return {
        providerUid: payload.sub!,
        email: payload.email as string | undefined,
      };
    } catch {
      throw new UnauthorizedException('Identity token da Apple inválido');
    }
  }
}

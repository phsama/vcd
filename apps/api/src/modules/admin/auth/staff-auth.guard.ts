import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { StaffJwtPayload } from './staff-auth.service';

export const ROLES_KEY = 'staff_roles';
/** Restringe a rota a roles específicas. Sem o decorator, qualquer staff autenticado passa. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export interface StaffRequest extends Request {
  staff: StaffJwtPayload;
}

@Injectable()
export class StaffAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StaffRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException();

    let payload: StaffJwtPayload;
    try {
      // verifyOptions do module exige audience "staff" — JWT de usuário comum é rejeitado aqui.
      payload = await this.jwt.verifyAsync<StaffJwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required?.length && !required.includes(payload.role) && payload.role !== 'admin') {
      throw new ForbiddenException('Role insuficiente');
    }

    request.staff = payload;
    return true;
  }
}

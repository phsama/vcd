import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../database/prisma.service';

export interface StaffJwtPayload {
  sub: string;
  role: string;
  aud: string;
}

@Injectable()
export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const staff = await this.prisma.staffUser.findUnique({ where: { email } });
    if (!staff || !staff.active) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await argon2.verify(staff.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const token = await this.jwt.signAsync({ sub: staff.id, role: staff.role });
    return {
      token,
      staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role },
    };
  }
}

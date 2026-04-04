// src/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.accessToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub: string; mobile: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        mobile: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not authorized');
    }

    return user;
  }
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request } from 'express';
import { ActivityAction } from 'src/common/enums/activity-action.enum';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthUtilsService {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async generateTokens(userId: string, mobile: string, role: string) {
    const payload = { sub: userId, mobile, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async saveRefreshToken(
    userId: string,
    token: string,
    device?: string,
    userAgent?: string,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
        userAgent,
        device,
      },
    });
  }

  async createActivityLog(
    action: ActivityAction,
    userId?: string,
    req?: Request,
    metadata?: Prisma.JsonValue,
  ) {
    const device = req?.useragent
      ? `${req.useragent.browser} (${req.useragent.os})`
      : null;

    const userAgent = req?.headers['user-agent'] ?? null;

    await this.prisma.activityLog.create({
      data: {
        action,
        userId: userId ?? null,
        ip: req?.ip ?? null,
        device,
        userAgent,
        metadata,
      },
    });
  }
}

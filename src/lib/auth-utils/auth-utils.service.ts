import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request } from 'express';
import { ActivityAction } from 'src/common/enums/activity-action.enum';
import { Prisma } from '@prisma/client';
import { UAParser } from 'ua-parser-js';
import * as geoip from 'geoip-lite';

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
    const userAgent = req?.headers['user-agent'];
    let ip = req?.ip ?? null;

    if (
      ip === '::1' ||
      ip === '127.0.0.1' ||
      ip?.startsWith('::ffff:127.0.0.1')
    ) {
      ip = '8.8.8.8'; // ? USA
    }

    const parser = new UAParser(userAgent);

    const device = parser.getDevice().model || 'Desktop';
    const browser = parser.getBrowser().name || 'Unknown';
    const os = parser.getOS().name || 'Unknown';

    let latitude: number | null = null;
    let longitude: number | null = null;
    let country: string | null = null;
    let city: string | null = null;

    if (ip) {
      const geo = geoip.lookup(ip);
      if (geo) {
        latitude = geo.ll[0];
        longitude = geo.ll[1];
        country = geo.country;
        city = geo.city || null;
      }
    }

    await this.prisma.activityLog.create({
      data: {
        action,
        userId: userId ?? null,
        ip,
        device,
        browser,
        os,
        userAgent,
        latitude,
        longitude,
        country,
        city,
        metadata,
      },
    });
  }
}

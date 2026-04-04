import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';

// ? Import enum
import { ActivityAction } from 'src/common/enums/activity-action.enum';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ! REGISTER
  async register(dto: RegisterDto, req?: Request) {
    const mobileExists = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });

    const emailExists = dto.email
      ? await this.prisma.user.findUnique({ where: { email: dto.email } })
      : null;

    if (mobileExists) {
      await this.authUtils.createActivityLog(
        ActivityAction.REGISTER_FAILED,
        undefined,
        req,
        { mobile: dto.mobile, reason: 'Mobile already registered' },
      );
      throw new ConflictException('Mobile number already registered');
    }

    if (emailExists) {
      await this.authUtils.createActivityLog(
        ActivityAction.REGISTER_FAILED,
        undefined,
        req,
        { email: dto.email, reason: 'Email already registered' },
      );
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        mobile: dto.mobile,
        ...(dto.email && { email: dto.email }),
        password: hashedPassword,
        role: dto.role ?? 'EMPLOYEE',
        isMobileVerified: false,
        status: 'PENDING_ACTIVATION',
      },
      select: {
        id: true,
        mobile: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.REGISTER_SUCCESS,
      user.id,
      req,
      { mobile: user.mobile },
    );

    return user;
  }

  // ! LOGIN
  async login(dto: LoginDto, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });

    // ? user not found
    if (!user) {
      await this.authUtils.createActivityLog(
        ActivityAction.LOGIN_FAILED,
        undefined,
        req,
        { mobile: dto.mobile, reason: 'User not found' },
      );

      throw new UnauthorizedException('Invalid mobile or password');
    }

    // ? validate password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      await this.authUtils.createActivityLog(
        ActivityAction.LOGIN_FAILED,
        user.id,
        req,
        { mobile: dto.mobile, reason: 'Invalid password' },
      );

      throw new UnauthorizedException('Invalid mobile or password');
    }

    // * device limit (max 2)
    const activeSessions = await this.prisma.refreshToken.count({
      where: {
        userId: user.id,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (activeSessions >= 2) {
      await this.authUtils.createActivityLog(
        ActivityAction.LOGIN_FAILED,
        user.id,
        req,
        {
          mobile: dto.mobile,
          reason: 'Maximum number of logged-in devices reached',
          activeSessions,
        },
      );

      throw new UnauthorizedException(
        'Maximum number of logged-in devices reached',
      );
    }

    // ? device info
    const deviceInfo = req?.useragent
      ? `${req.useragent.browser} (${req.useragent.os})`
      : 'Unknown Device';

    const userAgent = req?.headers['user-agent'] ?? 'Unknown';

    // ? generate tokens
    const tokens = await this.authUtils.generateTokens(
      user.id,
      user.mobile,
      user.role,
    );

    // ? save refresh token
    await this.authUtils.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      deviceInfo,
      userAgent,
    );

    // ? log success
    await this.authUtils.createActivityLog(
      ActivityAction.LOGIN_SUCCESS,
      user.id,
      req,
      {
        mobile: dto.mobile,
        sessionsCount: activeSessions + 1,
        device: deviceInfo,
      },
    );

    return {
      user: {
        id: user.id,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      ...tokens,
    };
  }

  // ! REFRESH TOKEN
  async refreshToken(token: string, req?: Request) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored) {
      await this.authUtils.createActivityLog(
        ActivityAction.TOKEN_REFRESH_FAILED,
        undefined,
        req,
        { reason: 'Token not found', token: token.substring(0, 10) + '...' },
      );
      throw new UnauthorizedException('Invalid token');
    }

    if (stored.isRevoked) {
      await this.authUtils.createActivityLog(
        ActivityAction.TOKEN_REFRESH_FAILED,
        stored.userId,
        req,
        { reason: 'Token revoked', token: token.substring(0, 10) + '...' },
      );
      throw new UnauthorizedException('Token revoked');
    }

    if (stored.expiresAt < new Date()) {
      await this.authUtils.createActivityLog(
        ActivityAction.TOKEN_REFRESH_FAILED,
        stored.userId,
        req,
        { reason: 'Token expired', token: token.substring(0, 10) + '...' },
      );
      throw new UnauthorizedException('Token expired');
    }

    // ? revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    // ? generate new tokens
    const tokens = await this.authUtils.generateTokens(
      stored.user.id,
      stored.user.mobile,
      stored.user.role,
    );

    // ? save new refresh token
    const deviceInfo = req?.useragent
      ? `${req.useragent.browser} (${req.useragent.os})`
      : 'Unknown Device';
    const useragentHeader = req?.headers['user-agent'] ?? 'Unknown';

    await this.authUtils.saveRefreshToken(
      stored.user.id,
      tokens.refreshToken,
      deviceInfo,
      useragentHeader,
    );

    await this.authUtils.createActivityLog(
      ActivityAction.TOKEN_REFRESH_SUCCESS,
      stored.user.id,
      req,
      {
        oldTokenId: stored.id,
        newToken: tokens.refreshToken.substring(0, 10) + '...',
      },
    );

    return tokens;
  }

  // ! ACTIVE SESSIONS
  async getActiveSessions(userId: string) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        device: true,
        userAgent: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return sessions;
  }

  // ! LOGOUT
  async logout(refreshToken: string, req?: Request) {
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { token: refreshToken },
      select: { id: true, userId: true, device: true, userAgent: true },
    });

    if (tokenRecord) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      });

      await this.authUtils.createActivityLog(
        ActivityAction.LOGOUT,
        tokenRecord.userId,
        req,
        {
          tokenId: tokenRecord.id,
          device: tokenRecord.device,
          userAgent: tokenRecord.userAgent,
        },
      );

      return {
        message: 'Logged out successfully',
      };
    } else {
      throw new UnauthorizedException('Invalid logout request');
    }
  }

  // ! LOGOUT FROM SPECIAL DEVICE
  async logoutFromDevice(userId: string, deviceId: string, req?: Request) {
    const revoked = await this.prisma.refreshToken.update({
      where: {
        id: deviceId,
        userId: userId,
      },
      data: {
        isRevoked: true,
      },
      select: {
        id: true,
        userId: true,
        device: true,
        userAgent: true,
      },
    });

    if (!revoked) {
      throw new UnauthorizedException('Device not found or not owned by user');
    }

    // ? Logout form special device
    await this.authUtils.createActivityLog(
      ActivityAction.LOGOUT_FROM_DEVICE,
      userId,
      req,
      {
        deviceId: revoked.id,
        device: revoked.device,
        userAgent: revoked.userAgent,
      },
    );

    return { message: 'Logged out from specific device' };
  }

  // ! LOGOUT FROM ALL DEVICE
  async logoutAll(userId: string, req?: Request) {
    const results = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    // ? Logout from all device
    await this.authUtils.createActivityLog(
      ActivityAction.LOGOUT_ALL,
      userId,
      req,
      { devicesRevoked: results.count },
    );

    return {
      message: `Logged out from ${results.count} devices`,
    };
  }
}

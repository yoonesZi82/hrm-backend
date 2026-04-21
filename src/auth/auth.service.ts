import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
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
  async register(dto: RegisterDto, req: Request) {
    const mobileExists = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });

    const emailExists = dto.email
      ? await this.prisma.user.findUnique({ where: { email: dto.email } })
      : null;

    if (mobileExists) {
      await this.authUtils.createActivityLog(
        ActivityAction.REGISTER_FAILED,
        mobileExists.id,
        req,
        { reason: 'Mobile number already registered' },
      );
      throw new ConflictException('Mobile number already registered');
    }

    if (emailExists) {
      await this.authUtils.createActivityLog(
        ActivityAction.REGISTER_FAILED,
        emailExists.id,
        req,
        { reason: 'Email is already registered' },
      );
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        mobile: dto.mobile,
        email: dto.email ?? '',
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
      { reason: 'User create successfully' },
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
      throw new UnauthorizedException('Invalid mobile or password');
    }

    // ? validate password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      await this.authUtils.createActivityLog(
        ActivityAction.LOGIN_FAILED,
        user.id,
        req,
        { reason: 'Invalid mobile or password' },
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
        { reason: 'Maximum number of logged-in devices reached' },
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
      { reason: 'User login successfully' },
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
      throw new UnauthorizedException('Invalid token');
    }

    if (stored.isRevoked) {
      await this.authUtils.createActivityLog(
        ActivityAction.TOKEN_REFRESH_FAILED,
        stored.user.id,
        req,
        { reason: 'Token revoked' },
      );
      throw new UnauthorizedException('Token revoked');
    }

    if (stored.expiresAt < new Date()) {
      await this.authUtils.createActivityLog(
        ActivityAction.TOKEN_REFRESH_FAILED,
        stored.user.id,
        req,
        { reason: 'Token expired' },
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
      { reason: 'Token expired' },
    );

    return tokens;
  }

  // ! ACTIVE SESSIONS
  async getActiveSessions(userId: string, req?: Request) {
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

    if (!sessions || sessions.length === 0) {
      await this.authUtils.createActivityLog(
        ActivityAction.SESSIONS_NOT_FOUND,
        userId,
        req,
        { reason: 'Not found any session' },
      );
      throw new NotFoundException('Not found any session');
    }

    await this.authUtils.createActivityLog(
      ActivityAction.SESSIONS_FOUND,
      userId,
      req,
      { reason: 'found sessions' },
    );

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
        { reason: 'Logged out successfully' },
      );

      return {
        message: 'Logged out successfully',
      };
    } else {
      await this.authUtils.createActivityLog(
        ActivityAction.LOGOUT_FAILED,
        undefined,
        req,
        { reason: 'Invalid logout request' },
      );
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
      await this.authUtils.createActivityLog(
        ActivityAction.LOGOUT_FROM_DEVICE_FAILED,
        userId,
        req,
        { reason: 'Device not found or not owned by user' },
      );

      throw new UnauthorizedException('Device not found or not owned by user');
    }
    await this.authUtils.createActivityLog(
      ActivityAction.LOGOUT_FROM_DEVICE,
      userId,
      req,
      { reason: 'Logged out from specific device' },
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
      { reason: `Logged out from ${results.count} devices` },
    );

    return {
      message: `Logged out from ${results.count} devices`,
    };
  }
}

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
import { ActivityLog } from '@/common/decorators/activity-log.decorator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ! REGISTER
  // @ActivityLog(ActivityAction.REGISTER_SUCCESS, ActivityAction.REGISTER_FAILED)
  async register(dto: RegisterDto) {
    const mobileExists = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });

    const emailExists = dto.email
      ? await this.prisma.user.findUnique({ where: { email: dto.email } })
      : null;

    if (mobileExists) {
      throw new ConflictException('Mobile number already registered');
    }

    if (emailExists) {
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

    return user;
  }

  // ! LOGIN
  // @ActivityLog(ActivityAction.LOGIN_SUCCESS, ActivityAction.LOGIN_FAILED)
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
  @ActivityLog(
    ActivityAction.TOKEN_REFRESH_SUCCESS,
    ActivityAction.TOKEN_REFRESH_FAILED,
  )
  async refreshToken(token: string, req?: Request) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid token');
    }

    if (stored.isRevoked) {
      throw new UnauthorizedException('Token revoked');
    }

    if (stored.expiresAt < new Date()) {
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

    return tokens;
  }

  // ! ACTIVE SESSIONS
  @ActivityLog(ActivityAction.SESSIONS_FOUND, ActivityAction.SESSIONS_NOT_FOUND)
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

    if (!sessions || sessions.length === 0) {
      throw new NotFoundException('Not found any session');
    }
    return sessions;
  }

  // ! LOGOUT
  // @ActivityLog(ActivityAction.LOGOUT, ActivityAction.LOGOUT_FAILED)
  async logout(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { token: refreshToken },
      select: { id: true, userId: true, device: true, userAgent: true },
    });

    if (tokenRecord) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      });

      return {
        message: 'Logged out successfully',
      };
    } else {
      throw new UnauthorizedException('Invalid logout request');
    }
  }

  // ! LOGOUT FROM SPECIAL DEVICE
  @ActivityLog(
    ActivityAction.LOGOUT_FROM_DEVICE,
    ActivityAction.LOGOUT_FROM_DEVICE_FAILED,
  )
  async logoutFromDevice(userId: string, deviceId: string) {
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
    return { message: 'Logged out from specific device' };
  }

  // ! LOGOUT FROM ALL DEVICE
  @ActivityLog(ActivityAction.LOGOUT_ALL, ActivityAction.LOGOUT_ALL_FAILED)
  async logoutAll(userId: string) {
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
    return {
      message: `Logged out from ${results.count} devices`,
    };
  }
}

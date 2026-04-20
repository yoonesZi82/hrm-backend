import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { ActivityAction } from '@/common/enums/activity-action.enum';
import { Request } from 'express';
import { ActivityLog } from '@/common/decorators/activity-log.decorator';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  async getAllUsers(query: QueryUsersDto, userId: string, req: Request) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const skip = (page - 1) * limit;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          mobile: true,
          status: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    await this.authUtils.createActivityLog(
      ActivityAction.GET_USERS_SUCCESS,
      userId,
      req,
      { reason: 'Get all users successfully' },
    );

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @ActivityLog(ActivityAction.GET_USER_SUCCESS, ActivityAction.GET_USER_FAILED)
  async getUserById(id: string, userId: string, req: Request) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        mobile: true,
        status: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      await this.authUtils.createActivityLog(
        ActivityAction.GET_USER_FAILED,
        userId,
        req,
        { userId, reason: 'User not found' },
      );
      throw new NotFoundException('User not found');
    }

    await this.authUtils.createActivityLog(
      ActivityAction.GET_USER_SUCCESS,
      userId,
      req,
      { userId, reason: 'User not found' },
    );

    return user;
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    userId: string,
    req: Request,
  ) {
    if (id !== userId) {
      await this.authUtils.createActivityLog(
        ActivityAction.UPDATE_USER_FAILED,
        userId,
        req,
        { userId, ...dto, reason: 'Only your account' },
      );
      throw new ForbiddenException('Only your account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      await this.authUtils.createActivityLog(
        ActivityAction.UPDATE_USER_FAILED,
        userId,
        req,
        { userId, ...dto, reason: 'User not found' },
      );
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        mobile: dto.mobile,
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.UPDATE_USER_SUCCESS,
      userId,
      req,
      { userId, ...dto, reason: 'User not found' },
    );

    return updated;
  }

  async deleteUser(id: string, userId: string, req?: Request) {
    if (id !== userId) {
      await this.authUtils.createActivityLog(
        ActivityAction.DELETE_USER_FAILED,
        userId,
        req,
        { userId, reason: 'Only your account' },
      );
      throw new ForbiddenException('Only your account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      await this.authUtils.createActivityLog(
        ActivityAction.DELETE_USER_FAILED,
        userId,
        req,
        { userId, reason: 'User not found' },
      );
      throw new NotFoundException('User not found');
    }

    const deleted = await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.DELETE_USER_SUCCESS,
      userId,
      req,
      { deletedUser: id },
    );

    return deleted;
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { ActivityAction } from '@/common/enums/activity-action.enum';
import { Request } from 'express';
import { ActivityLog } from '@/common/decorators/activity-log.decorator';

@Injectable()
export class UserPermissionsService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ! ASSIGN PERMISSION TO USER
  @ActivityLog(
    ActivityAction.ASSIGN_PERMISSION_TO_USER_SUCCESS,
    ActivityAction.ASSIGN_PERMISSION_TO_USER_FAILED,
  )
  async assignPermission(userId: string, permissionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const exists = await this.prisma.userPermission.findFirst({
      where: { userId, permissionId },
    });

    if (exists) {
      throw new ConflictException('Permission already assigned to user');
    }

    const result = await this.prisma.userPermission.create({
      data: { userId, permissionId },
    });

    return result;
  }

  // ! GET USER PERMISSIONS
  @ActivityLog(
    ActivityAction.GET_USER_PERMISSIONS_SUCCESS,
    ActivityAction.GET_USER_PERMISSIONS_FAILED,
  )
  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = await this.prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true,
      },
    });

    return permissions;
  }

  // ! REMOVE USER PERMISSION
  @ActivityLog(
    ActivityAction.REMOVE_PERMISSION_FROM_USER_SUCCESS,
    ActivityAction.REMOVE_PERMISSION_FROM_USER_FAILED,
  )
  async removeUserPermission(userId: string, permissionId: string) {
    const existing = await this.prisma.userPermission.findFirst({
      where: { userId, permissionId },
    });

    if (!existing) {
      throw new NotFoundException('User permission not found');
    }

    await this.prisma.userPermission.delete({
      where: { id: existing.id },
    });

    return { message: 'Permission removed from user' };
  }
}

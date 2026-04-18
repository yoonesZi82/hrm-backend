import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { ActivityAction } from '@/common/enums/activity-action.enum';
import { Request } from 'express';

@Injectable()
export class UserPermissionsService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ! ASSIGN PERMISSION TO USER
  async assignPermission(
    userId: string,
    permissionId: string,
    currentUserId: string,
    req?: Request,
  ) {
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

    await this.authUtils.createActivityLog(
      ActivityAction.ASSIGN_PERMISSION_TO_USER_SUCCESS,
      currentUserId,
      req,
      { userId, permissionId },
    );

    return result;
  }

  // ! GET USER PERMISSIONS
  async getUserPermissions(
    userId: string,
    currentUserId: string,
    req?: Request,
  ) {
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

    await this.authUtils.createActivityLog(
      ActivityAction.GET_USER_PERMISSIONS_SUCCESS,
      currentUserId,
      req,
      { userId },
    );

    return permissions;
  }

  // ! REMOVE USER PERMISSION
  async removeUserPermission(
    userId: string,
    permissionId: string,
    currentUserId: string,
    req?: Request,
  ) {
    const existing = await this.prisma.userPermission.findFirst({
      where: { userId, permissionId },
    });

    if (!existing) {
      throw new NotFoundException('User permission not found');
    }

    await this.prisma.userPermission.delete({
      where: { id: existing.id },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.REMOVE_PERMISSION_FROM_USER_SUCCESS,
      currentUserId,
      req,
      { userId, permissionId },
    );

    return { message: 'Permission removed from user' };
  }
}

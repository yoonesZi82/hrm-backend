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
  async assignPermission(userId: string, permissionId: string, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      await this.authUtils.createActivityLog(
        ActivityAction.ASSIGN_PERMISSION_TO_USER_FAILED,
        userId,
        req,
        { reason: 'User not found' },
      );
      throw new NotFoundException('User not found');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      await this.authUtils.createActivityLog(
        ActivityAction.ASSIGN_PERMISSION_TO_USER_FAILED,
        userId,
        req,
        { reason: 'Permission not found' },
      );
      throw new NotFoundException('Permission not found');
    }

    const exists = await this.prisma.userPermission.findFirst({
      where: { userId, permissionId },
    });

    if (exists) {
      await this.authUtils.createActivityLog(
        ActivityAction.ASSIGN_PERMISSION_TO_USER_FAILED,
        userId,
        req,
        { reason: 'Permission already assigned to user' },
      );
      throw new ConflictException('Permission already assigned to user');
    }

    const result = await this.prisma.userPermission.create({
      data: { userId, permissionId },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.ASSIGN_PERMISSION_TO_USER_SUCCESS,
      userId,
      req,
      { reason: 'Assign permission to user successfully' },
    );

    return result;
  }

  // ! GET USER PERMISSIONS
  async getUserPermissions(userId: string, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      await this.authUtils.createActivityLog(
        ActivityAction.GET_USER_PERMISSIONS_FAILED,
        userId,
        req,
        { reason: 'User not found' },
      );
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
      userId,
      req,
      { reason: 'User permission found' },
    );
    return permissions;
  }

  // ! REMOVE USER PERMISSION
  async removeUserPermission(
    userId: string,
    permissionId: string,
    req?: Request,
  ) {
    const existing = await this.prisma.userPermission.findFirst({
      where: { userId, permissionId },
    });

    if (!existing) {
      await this.authUtils.createActivityLog(
        ActivityAction.REMOVE_PERMISSION_FROM_USER_FAILED,
        userId,
        req,
        { reason: 'User permission not found' },
      );
      throw new NotFoundException('User permission not found');
    }

    await this.prisma.userPermission.delete({
      where: { id: existing.id },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.REMOVE_PERMISSION_FROM_USER_SUCCESS,
      userId,
      req,
      { reason: 'Permission removed from user' },
    );

    return { message: 'Permission removed from user' };
  }
}

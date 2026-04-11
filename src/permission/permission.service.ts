import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { ActivityAction } from '@/common/enums/activity-action.enum';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { Request } from 'express';

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ! CREATE PERMISSION
  async createPermission(
    dto: CreatePermissionDto,
    userId: string,
    req?: Request,
  ) {
    const exists = await this.prisma.permission.findUnique({
      where: { name: dto.name },
    });

    if (exists) {
      await this.authUtils.createActivityLog(
        ActivityAction.CREATE_PERMISSION_FAILED,
        userId,
        req,
        { name: dto.name, reason: 'Permission exists' },
      );
      throw new ConflictException('Permission exists');
    }

    const permission = await this.prisma.permission.create({
      data: { name: dto.name },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.CREATE_PERMISSION_SUCCESS,
      userId,
      req,
      { name: dto.name, reason: 'Permission created successfully' },
    );
    return permission;
  }

  // ! ASSIGN PERMISSION TO ROLE
  async assignPermissionToRole(
    role: string,
    permissionId: string,
    userId: string,
    req?: Request,
  ) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      await this.authUtils.createActivityLog(
        ActivityAction.ASSIGN_PERMISSION_TO_ROLE_FAILED,
        userId,
        req,
        { role, permissionId, reason: 'Permission not found' },
      );
      throw new NotFoundException('Permission not found');
    }

    const rolePermission = await this.prisma.rolePermission.create({
      data: {
        role: role as any,
        permissionId,
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.ASSIGN_PERMISSION_TO_ROLE_SUCCESS,
      userId,
      req,
      {
        role,
        permissionId,
        reason: 'Permission assigned to role successfully',
      },
    );
    return rolePermission;
  }

  // ! GET ROLE PERMISSIONS
  async getRolePermissions(role: string, userId: string, req?: Request) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: role as any },
      include: {
        permission: true,
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.GET_ROLE_PERMISSIONS_SUCCESS,
      userId,
      req,
      { role, reason: 'Role permissions fetched successfully' },
    );
    return rolePermissions;
  }
}

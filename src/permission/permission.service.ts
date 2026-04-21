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
    userId: string,
    dto: CreatePermissionDto,
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
        { reason: 'Permission exists' },
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
      { permissionId: permission.id, reason: 'Create permission successfully' },
    );

    return permission;
  }

  // ! ASSIGN PERMISSION TO ROLE
  async assignPermissionToRole(
    userId: string,
    role: string,
    permissionId: string,
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
        { reason: 'Permission not found' },
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
      { reason: 'Assign permission successfully' },
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

  // ! GET ALL PERMISSIONS
  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany();

    return permissions;
  }

  // ! REMOVE PERMISSION FROM ROLE
  async removePermissionFromRole(
    userId: string,
    role: string,
    permissionId: string,
    req?: Request,
  ) {
    const existing = await this.prisma.rolePermission.findFirst({
      where: {
        role: role as any,
        permissionId,
      },
    });

    if (!existing) {
      await this.authUtils.createActivityLog(
        ActivityAction.REMOVE_PERMISSION_FROM_ROLE_FAILED,
        userId,
        req,
        { reason: 'RolePermission not found' },
      );
      throw new NotFoundException('RolePermission not found');
    }

    await this.prisma.rolePermission.delete({
      where: { id: existing.id },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.REMOVE_PERMISSION_FROM_ROLE_SUCCESS,
      userId,
      req,
      { reason: 'Permission removed from role' },
    );

    return { message: 'Permission removed from role' };
  }

  // ! DELETE PERMISSION (OPTIONAL BUT IMPORTANT)
  async deletePermission(userId: string, permissionId: string, req?: Request) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      await this.authUtils.createActivityLog(
        ActivityAction.REMOVE_PERMISSION_FAILED,
        userId,
        req,
        { reason: 'Permission not found' },
      );
      throw new NotFoundException('Permission not found');
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: { permissionId },
      }),
      this.prisma.userPermission.deleteMany({
        where: { permissionId },
      }),
      this.prisma.permission.delete({
        where: { id: permissionId },
      }),
    ]);

    await this.authUtils.createActivityLog(
      ActivityAction.REMOVE_PERMISSION_SUCCESS,
      userId,
      req,
      { reason: 'Permission deleted successfully' },
    );

    return { message: 'Permission deleted successfully' };
  }
}

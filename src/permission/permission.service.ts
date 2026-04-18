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

  // ! GET ALL PERMISSIONS
  async getAllPermissions(userId: string, req?: Request) {
    const permissions = await this.prisma.permission.findMany();

    await this.authUtils.createActivityLog(
      ActivityAction.GET_PERMISSIONS_SUCCESS,
      userId,
      req,
      { reason: 'All permissions fetched successfully' },
    );

    return permissions;
  }

  // ! REMOVE PERMISSION FROM ROLE
  async removePermissionFromRole(
    role: string,
    permissionId: string,
    userId: string,
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
        { role, permissionId, reason: 'Relation not found' },
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
      { role, permissionId },
    );

    return { message: 'Permission removed from role' };
  }

  // ! DELETE PERMISSION (OPTIONAL BUT IMPORTANT)
  async deletePermission(permissionId: string, userId: string, req?: Request) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      await this.authUtils.createActivityLog(
        ActivityAction.DELETE_PERMISSION_FAILED,
        userId,
        req,
        { permissionId, reason: 'Permission not found' },
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
      ActivityAction.DELETE_PERMISSION_SUCCESS,
      userId,
      req,
      { permissionId },
    );

    return { message: 'Permission deleted successfully' };
  }
}

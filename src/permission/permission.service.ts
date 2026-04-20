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
import { ActivityLog } from '@/common/decorators/activity-log.decorator';

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ! CREATE PERMISSION
  @ActivityLog(
    ActivityAction.CREATE_PERMISSION_SUCCESS,
    ActivityAction.CREATE_PERMISSION_FAILED,
  )
  async createPermission(dto: CreatePermissionDto) {
    const exists = await this.prisma.permission.findUnique({
      where: { name: dto.name },
    });

    if (exists) {
      throw new ConflictException('Permission exists');
    }

    const permission = await this.prisma.permission.create({
      data: { name: dto.name },
    });

    return permission;
  }

  // ! ASSIGN PERMISSION TO ROLE
  @ActivityLog(
    ActivityAction.ASSIGN_PERMISSION_TO_ROLE_SUCCESS,
    ActivityAction.ASSIGN_PERMISSION_TO_ROLE_FAILED,
  )
  async assignPermissionToRole(role: string, permissionId: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const rolePermission = await this.prisma.rolePermission.create({
      data: {
        role: role as any,
        permissionId,
      },
    });

    return rolePermission;
  }

  // ! GET ROLE PERMISSIONS
  @ActivityLog(
    ActivityAction.GET_ROLE_PERMISSIONS_SUCCESS,
    ActivityAction.GET_ROLE_PERMISSIONS_FAILED,
  )
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
  @ActivityLog(
    ActivityAction.GET_PERMISSIONS_SUCCESS,
    ActivityAction.GET_PERMISSIONS_FAILED,
  )
  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany();

    return permissions;
  }

  // ! REMOVE PERMISSION FROM ROLE
  @ActivityLog(
    ActivityAction.REMOVE_PERMISSION_FROM_ROLE_SUCCESS,
    ActivityAction.REMOVE_PERMISSION_FROM_ROLE_FAILED,
  )
  async removePermissionFromRole(role: string, permissionId: string) {
    const existing = await this.prisma.rolePermission.findFirst({
      where: {
        role: role as any,
        permissionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('RolePermission not found');
    }

    await this.prisma.rolePermission.delete({
      where: { id: existing.id },
    });

    return { message: 'Permission removed from role' };
  }

  // ! DELETE PERMISSION (OPTIONAL BUT IMPORTANT)
  @ActivityLog(
    ActivityAction.DELETE_PERMISSION_SUCCESS,
    ActivityAction.DELETE_PERMISSION_FAILED,
  )
  async deletePermission(permissionId: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
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

    return { message: 'Permission deleted successfully' };
  }
}

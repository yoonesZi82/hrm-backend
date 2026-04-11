import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { ActivityAction } from '../enums/activity-action.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = request.params.orgId;

    if (!user?.id || !orgId) {
      await this.authUtils.createActivityLog(
        ActivityAction.NOT_ACCESS,
        user?.id,
        request,
        {
          orgId,
          userId: user.id,
          reason: 'You must enter an organization id and user id',
        },
      );
      throw new ForbiddenException(
        'You must enter an organization id and user id',
      );
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        organizationId: orgId,
      },
    });

    if (!member) {
      await this.authUtils.createActivityLog(
        ActivityAction.MEMBER_NOTFOUND,
        user?.id,
        request,
        { orgId, userId: user.id, reason: 'Member not found' },
      );
      throw new NotFoundException('Member not found');
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: member.role },
      include: { permission: true },
    });

    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId: user.id },
      include: { permission: true },
    });

    const permissionsSet = new Set<string>();

    rolePermissions.forEach((rp) => permissionsSet.add(rp.permission.name));

    userPermissions.forEach((up) => permissionsSet.add(up.permission.name));

    const hasAccess = requiredPermissions.every((perm) =>
      permissionsSet.has(perm),
    );

    if (!hasAccess) {
      await this.authUtils.createActivityLog(
        ActivityAction.NOT_ACCESS,
        user?.id,
        request,
        {
          orgId,
          userId: user.id,
          permissions: requiredPermissions,
          reason: 'You do not have permission to access this resource',
        },
      );
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    await this.authUtils.createActivityLog(
      ActivityAction.API_ACCESS,
      user?.id,
      request,
      {
        orgId,
        userId: user.id,
        permissions: requiredPermissions,
        reason: 'You have permission to access this resource',
      },
    );

    return true;
  }
}

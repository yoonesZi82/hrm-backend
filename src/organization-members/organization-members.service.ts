import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { ActivityAction } from '@/common/enums/activity-action.enum';
import { Request } from 'express';

@Injectable()
export class OrganizationMembersService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ? helper
  async checkHasMember(userId: string, orgId: string, req?: Request) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId },
    });

    if (!member) {
      await this.authUtils.createActivityLog(
        ActivityAction.MEMBER_NOTFOUND,
        userId,
        req,
        { orgId, reason: 'Member is not found' },
      );
      throw new NotFoundException('Member is not found');
    }

    return member;
  }

  // ? ADD MEMBER
  async addMember(
    currentUserId: string,
    orgId: string,
    dto: AddMemberDto,
    req?: Request,
  ) {
    const exists = await this.prisma.organizationMember.findFirst({
      where: { userId: dto.userId, organizationId: orgId },
    });

    if (exists) {
      await this.authUtils.createActivityLog(
        ActivityAction.MEMBER_EXIST,
        currentUserId,
        req,
        { orgId, targetUser: dto.userId },
      );
      throw new ConflictException('Already member');
    }

    const member = await this.prisma.organizationMember.create({
      data: {
        userId: dto.userId,
        organizationId: orgId,
        role: dto.role,
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.ADD_MEMBER_SUCCESS,
      currentUserId,
      req,
      { orgId, targetUser: dto.userId, role: dto.role },
    );

    return member;
  }

  // ? GET MEMBERS
  async getMembers(userId: string, orgId: string) {
    await this.checkHasMember(userId, orgId);

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
          },
        },
      },
    });

    return members;
  }

  // ? UPDATE ROLE
  async updateRole(
    currentUserId: string,
    orgId: string,
    memberUserId: string,
    dto: UpdateRoleDto,
    req?: Request,
  ) {
    await this.checkHasMember(currentUserId, orgId, req);

    if (memberUserId === currentUserId) {
      await this.authUtils.createActivityLog(
        ActivityAction.UPDATE_MEMBER_ROLE_FAILED,
        currentUserId,
        req,
        { orgId, memberUserId, reason: 'Cannot change your own role' },
      );
      throw new ForbiddenException('Cannot change your own role');
    }

    const target = await this.prisma.organizationMember.findFirst({
      where: { userId: memberUserId, organizationId: orgId },
    });

    if (!target) {
      await this.authUtils.createActivityLog(
        ActivityAction.UPDATE_MEMBER_ROLE_FAILED,
        currentUserId,
        req,
        { orgId, memberUserId, reason: 'Member not found' },
      );
      throw new NotFoundException('Member not found');
    }

    if (target.role === 'OWNER') {
      await this.authUtils.createActivityLog(
        ActivityAction.UPDATE_MEMBER_ROLE_FAILED,
        currentUserId,
        req,
        { orgId, memberUserId, reason: 'Cannot change owner role' },
      );
      throw new ForbiddenException('Cannot change owner role');
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: target.id },
      data: { role: dto.role },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.UPDATE_MEMBER_ROLE_SUCCESS,
      currentUserId,
      req,
      { orgId, targetUser: memberUserId, role: dto.role },
    );

    return updated;
  }

  // ? REMOVE MEMBER
  async removeMember(
    currentUserId: string,
    orgId: string,
    memberUserId: string,
    req?: Request,
  ) {
    await this.checkHasMember(currentUserId, orgId, req);

    if (memberUserId === currentUserId) {
      await this.authUtils.createActivityLog(
        ActivityAction.REMOVE_MEMBER_FAILED,
        currentUserId,
        req,
        { orgId, memberUserId, reason: 'Cannot remove yourself' },
      );
      throw new ForbiddenException('Cannot remove yourself');
    }

    const target = await this.prisma.organizationMember.findFirst({
      where: { userId: memberUserId, organizationId: orgId },
    });

    if (!target) {
      await this.authUtils.createActivityLog(
        ActivityAction.REMOVE_MEMBER_FAILED,
        currentUserId,
        req,
        { orgId, memberUserId, reason: 'Member not found' },
      );
      throw new NotFoundException('Member not found');
    }

    if (target.role === 'OWNER') {
      await this.authUtils.createActivityLog(
        ActivityAction.REMOVE_MEMBER_FAILED,
        currentUserId,
        req,
        { orgId, memberUserId, reason: 'Cannot remove owner' },
      );
      throw new ForbiddenException('Cannot remove owner');
    }

    await this.prisma.organizationMember.delete({
      where: { id: target.id },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.REMOVE_MEMBER_SUCCESS,
      currentUserId,
      req,
      { orgId, removedUser: memberUserId },
    );

    return { message: 'Member removed successfully' };
  }
}

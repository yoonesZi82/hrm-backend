import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { addDays } from 'date-fns';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { ActivityAction } from '@/common/enums/activity-action.enum';
import { Request } from 'express';
import { ActivityLog } from '@/common/decorators/activity-log.decorator';

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ! CREATE INVITATION
  @ActivityLog(
    ActivityAction.CREATE_INVITATION_SUCCESS,
    ActivityAction.CREATE_INVITATION_FAILED,
  )
  async createInvitation(
    currentUserId: string,
    orgId: string,
    email: string,
    role: string,
    req?: Request,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: currentUserId, organizationId: orgId },
      include: {
        user: true,
      },
    });

    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      await this.authUtils.createActivityLog(
        ActivityAction.NOT_ACCESS,
        currentUserId,
        req,
        { userId: currentUserId, reason: 'No permission' },
      );
      throw new ForbiddenException('No permission');
    }

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        user: { email },
      },
    });

    if (existingMember) {
      throw new BadRequestException('Member is already in organization');
    }

    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        organizationId: orgId,
        user: { email },
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      throw new BadRequestException(
        'The active invite for user this organization yet',
      );
    }

    const token = randomUUID();

    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        organizationId: orgId,
        role: role as any,
        token,
        expiresAt: addDays(new Date(), 3), // ? 3 days
      },
    });

    return {
      ...invitation,
      inviteLink: `https://yourapp.com/invite/${token}`,
    };
  }

  // ! ACCEPT INVITATION
  @ActivityLog(
    ActivityAction.ACCEPT_INVITATION_SUCCESS,
    ActivityAction.ACCEPT_INVITATION_FAILED,
  )
  async acceptInvitation(currentUserId: string, token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new ConflictException('Invitation already used or revoke');
    }

    if (invitation.expiresAt < new Date()) {
      throw new ForbiddenException('Invitation expired');
    }

    // check user email match
    const user = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!user || user.email !== invitation.email) {
      throw new ForbiddenException('Email does not match invitation');
    }

    // ? check already member
    const exists = await this.prisma.organizationMember.findFirst({
      where: {
        userId: currentUserId,
        organizationId: invitation.organizationId,
      },
    });

    if (exists) {
      throw new ConflictException('Already member');
    }

    // transaction 🔥
    await this.prisma.$transaction([
      this.prisma.organizationMember.create({
        data: {
          userId: currentUserId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    return { message: 'Invitation accepted successfully' };
  }

  // ! GET INVITATIONS
  async getInvitations(currentUserId: string, orgId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: currentUserId, organizationId: orgId },
    });

    if (!member) throw new ForbiddenException();

    return this.prisma.invitation.findMany({
      where: { organizationId: orgId },
    });
  }

  // ! REVOKE INVITATION
  @ActivityLog(
    ActivityAction.REVOKE_INVITATION_SUCCESS,
    ActivityAction.REVOKE_INVITATION_FAILED,
  )
  async revokeInvitation(currentUserId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Not found invite');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('This invite is not active');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });

    return { message: 'Invitation revoked' };
  }

  // ! REMOVE INVITATION
  @ActivityLog(
    ActivityAction.REMOVE_INVITATION_SUCCESS,
    ActivityAction.REMOVE_INVITATION_FAILED,
  )
  async removeInvitation(currentUserId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Not found invite');
    }

    await this.prisma.invitation.delete({
      where: { id: invitationId },
    });

    return { message: 'Invite remove successfully' };
  }
}

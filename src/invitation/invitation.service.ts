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

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ! CREATE INVITATION
  async createInvitation(
    userId: string,
    orgId: string,
    email: string,
    role: string,
    req?: Request,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId },
      include: {
        user: true,
      },
    });

    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      await this.authUtils.createActivityLog(
        ActivityAction.NOT_ACCESS,
        userId,
        req,
        { userId: userId, reason: 'No permission' },
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
      await this.authUtils.createActivityLog(
        ActivityAction.CREATE_INVITATION_FAILED,
        userId,
        req,
        { reason: 'Member is already in organization' },
      );
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
      await this.authUtils.createActivityLog(
        ActivityAction.CREATE_INVITATION_FAILED,
        userId,
        req,
        { reason: 'The active invite for user this organization yet' },
      );
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

    await this.authUtils.createActivityLog(
      ActivityAction.CREATE_INVITATION_SUCCESS,
      userId,
      req,
      { invitationId: invitation.id, reason: 'Create invitation successfully' },
    );

    return {
      ...invitation,
      inviteLink: `https://yourapp.com/invite/${token}`,
    };
  }

  // ! ACCEPT INVITATION
  async acceptInvitation(userId: string, token: string, req?: Request) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      await this.authUtils.createActivityLog(
        ActivityAction.ACCEPT_INVITATION_FAILED,
        userId,
        req,
        { reason: 'Invitation not found' },
      );
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      await this.authUtils.createActivityLog(
        ActivityAction.ACCEPT_INVITATION_FAILED,
        userId,
        req,
        { reason: 'Invitation already used or revoke' },
      );
      throw new ConflictException('Invitation already used or revoke');
    }

    if (invitation.expiresAt < new Date()) {
      await this.authUtils.createActivityLog(
        ActivityAction.ACCEPT_INVITATION_FAILED,
        userId,
        req,
        { reason: 'Invitation expired' },
      );
      throw new ForbiddenException('Invitation expired');
    }

    // check user email match
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== invitation.email) {
      await this.authUtils.createActivityLog(
        ActivityAction.ACCEPT_INVITATION_FAILED,
        userId,
        req,
        { reason: 'Email does not match invitation' },
      );
      throw new ForbiddenException('Email does not match invitation');
    }

    // ? check already member
    const exists = await this.prisma.organizationMember.findFirst({
      where: {
        userId: userId,
        organizationId: invitation.organizationId,
      },
    });

    if (exists) {
      await this.authUtils.createActivityLog(
        ActivityAction.ACCEPT_INVITATION_FAILED,
        userId,
        req,
        { reason: 'Already member' },
      );
      throw new ConflictException('Already member');
    }

    // transaction 🔥
    await this.prisma.$transaction([
      this.prisma.organizationMember.create({
        data: {
          userId: userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    await this.authUtils.createActivityLog(
      ActivityAction.ACCEPT_INVITATION_SUCCESS,
      userId,
      req,
      { reason: 'Invitation accepted successfully' },
    );

    return { message: 'Invitation accepted successfully' };
  }

  // ! GET INVITATIONS
  async getInvitations(userId: string, orgId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: userId, organizationId: orgId },
    });

    if (!member) throw new ForbiddenException();

    const invitations = this.prisma.invitation.findMany({
      where: { organizationId: orgId },
    });

    return invitations;
  }

  // ! REVOKE INVITATION
  async revokeInvitation(userId: string, invitationId: string, req?: Request) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      await this.authUtils.createActivityLog(
        ActivityAction.REVOKE_INVITATION_FAILED,
        userId,
        req,
        { reason: 'Not found invite' },
      );
      throw new NotFoundException('Not found invite');
    }

    if (invitation.status !== 'PENDING') {
      await this.authUtils.createActivityLog(
        ActivityAction.REVOKE_INVITATION_FAILED,
        userId,
        req,
        { reason: 'This invite is not active' },
      );
      throw new BadRequestException('This invite is not active');
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.REVOKE_INVITATION_SUCCESS,
      userId,
      req,
      { reason: 'Invitation is revoked' },
    );

    return { message: 'Invitation is revoked' };
  }

  // ! REMOVE INVITATION
  async removeInvitation(userId: string, invitationId: string, req?: Request) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      await this.authUtils.createActivityLog(
        ActivityAction.REMOVE_INVITATION_FAILED,
        userId,
        req,
        { reason: 'Not found invite' },
      );
      throw new NotFoundException('Not found invite');
    }

    await this.prisma.invitation.delete({
      where: { id: invitationId },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.REMOVE_INVITATION_SUCCESS,
      userId,
      req,
      { reason: 'Invite is remove successfully' },
    );
    return { message: 'Invite is remove successfully' };
  }
}

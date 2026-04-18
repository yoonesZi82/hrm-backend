import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
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
    currentUserId: string,
    orgId: string,
    email: string,
    role: string,
    req?: Request,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: currentUserId, organizationId: orgId },
    });

    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException('No permission');
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
      currentUserId,
      req,
      { orgId, email, role },
    );

    return {
      ...invitation,
      inviteLink: `https://yourapp.com/invite/${token}`,
    };
  }

  // ! ACCEPT INVITATION
  async acceptInvitation(currentUserId: string, token: string, req?: Request) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new ConflictException('Invitation already used');
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

    // check already member
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

    await this.authUtils.createActivityLog(
      ActivityAction.ACCEPT_INVITATION_SUCCESS,
      currentUserId,
      req,
      { orgId: invitation.organizationId },
    );

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
  async revokeInvitation(
    currentUserId: string,
    invitationId: string,
    req?: Request,
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) throw new NotFoundException();

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.REVOKE_INVITATION_SUCCESS,
      currentUserId,
      req,
      { invitationId },
    );

    return { message: 'Invitation revoked' };
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ActivityAction } from '@/common/enums/activity-action.enum';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { Request } from 'express';
import { normalizeSlug } from '@/lib/utils';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ? 1. CREATE
  async create(userId: string, dto: CreateOrganizationDto, req?: Request) {
    const slug = normalizeSlug(dto.slug);

    const exists = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (exists) {
      await this.authUtils.createActivityLog(
        ActivityAction.CREATE_ORGANIZATION_FAILED,
        userId,
        req,
        {
          organizationId: exists.id,
          userId,
          ...dto,
          reason: 'Slug already exists',
        },
      );
      throw new ConflictException('Slug already exists');
    }

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        domain: dto.domain,
        primaryColor: dto.primaryColor,
        ownerId: userId,

        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },

        settings: {
          create: {},
        },

        subscription: {
          create: {},
        },
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.CREATE_ORGANIZATION_SUCCESS,
      userId,
      req,
      {
        organizationId: org.id,
        ...dto,
        reason: 'Organization created successfully',
      },
    );

    return org;
  }

  // ? 2. GET
  async findById(userId: string, orgId: string, req?: Request) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
    });

    if (!member) {
      await this.authUtils.createActivityLog(
        ActivityAction.GET_ORGANIZATION_FAILED,
        userId,
        req,
        { organizationId: orgId, userId, reason: 'Member not found' },
      );
      throw new ForbiddenException('Member not found');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        owner: true,
        members: true,
        subscription: true,
        settings: true,
      },
    });

    if (!org) {
      await this.authUtils.createActivityLog(
        ActivityAction.GET_ORGANIZATION_FAILED,
        userId,
        req,
        { organizationId: orgId, userId, reason: 'Organization not found' },
      );
      throw new NotFoundException('Organization not found');
    }

    await this.authUtils.createActivityLog(
      ActivityAction.GET_ORGANIZATION_SUCCESS,
      userId,
      req,
      {
        organizationId: org.id,
        name: org.name,
        slug: org.slug,
        ownerId: org.ownerId,
        memberCount: org.members.length,
        reason: 'Organization found successfully',
      },
    );

    return org;
  }

  // ? 3. UPDATE
  async update(
    userId: string,
    orgId: string,
    dto: UpdateOrganizationDto,
    req?: Request,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
    });

    if (!member) {
      await this.authUtils.createActivityLog(
        ActivityAction.UPDATE_ORGANIZATION_FAILED,
        userId,
        req,
        {
          organizationId: orgId,
          userId,
          reason: 'Member not found',
        },
      );
      throw new NotFoundException('Member not found');
    }

    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      await this.authUtils.createActivityLog(
        ActivityAction.NOT_ACCESS,
        userId,
        req,
        {
          organizationId: orgId,
          userId,
          reason: 'Your not access',
        },
      );
      throw new ForbiddenException('Your not access');
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.name,
        domain: dto.domain,
        primaryColor: dto.primaryColor,
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.UPDATE_ORGANIZATION_SUCCESS,
      userId,
      req,
      {
        organizationId: orgId,
        name: dto.name,
        domain: dto.domain,
        primaryColor: dto.primaryColor,
        reason: 'Organization updated successfully',
      },
    );

    return updated;
  }

  // ? 4. DELETE
  async delete(userId: string, orgId: string, req?: Request) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      await this.authUtils.createActivityLog(
        ActivityAction.DELETE_ORGANIZATION_FAILED,
        userId,
        req,
        { organizationId: orgId, userId, reason: 'Organization not found' },
      );
      throw new NotFoundException('Organization not found');
    }

    if (!(await this.isOwnerOrg(userId, orgId))) {
      await this.authUtils.createActivityLog(
        ActivityAction.DELETE_ORGANIZATION_FAILED,
        userId,
        req,
        { organizationId: orgId, userId, reason: 'Only owner can delete' },
      );
      throw new ForbiddenException('Only owner can delete');
    }

    // ! manual cascade
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMember.deleteMany({
        where: { organizationId: orgId },
      });
      await tx.invitation.deleteMany({ where: { organizationId: orgId } });
      await tx.branch.deleteMany({ where: { organizationId: orgId } });
      await tx.organizationSettings.deleteMany({
        where: { organizationId: orgId },
      });
      await tx.subscription.deleteMany({ where: { organizationId: orgId } });
      return tx.organization.delete({ where: { id: orgId } });
    });

    await this.authUtils.createActivityLog(
      ActivityAction.DELETE_ORGANIZATION_SUCCESS,
      userId,
      req,
      {
        organizationId: orgId,
        userId,
        reason: 'Organization deleted successfully',
      },
    );

    return { message: 'Organization deleted successfully' };
  }

  // ? HELPER METHODS

  async isOwnerOrg(userId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { ownerId: true },
    });

    return org?.ownerId === userId ? true : false;
  }
}

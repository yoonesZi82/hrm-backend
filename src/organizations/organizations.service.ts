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
import { ActivityLog } from '@/common/decorators/activity-log.decorator';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ? 1. CREATE
  @ActivityLog(
    ActivityAction.CREATE_ORGANIZATION_SUCCESS,
    ActivityAction.CREATE_ORGANIZATION_FAILED,
  )
  async create(userId: string, dto: CreateOrganizationDto) {
    const slug = normalizeSlug(dto.slug);

    const exists = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (exists) {
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

    return org;
  }

  // ? 2. GET BY ID
  @ActivityLog(
    ActivityAction.GET_ORGANIZATION_SUCCESS,
    ActivityAction.GET_ORGANIZATION_FAILED,
  )
  async getAll() {
    const orgs = await this.prisma.organization.findMany({
      include: {
        owner: true,
        members: true,
        subscription: true,
        settings: true,
      },
    });

    if (!orgs) {
      throw new NotFoundException('Organizations not found');
    }

    return orgs;
  }

  // ? 3. GET BY ID
  @ActivityLog(
    ActivityAction.GET_ORGANIZATION_SUCCESS,
    ActivityAction.GET_ORGANIZATION_FAILED,
  )
  async findById(userId: string, orgId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
    });

    if (!member) {
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
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  // ? 4. UPDATE
  @ActivityLog(
    ActivityAction.UPDATE_ORGANIZATION_SUCCESS,
    ActivityAction.UPDATE_ORGANIZATION_FAILED,
  )
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

    return updated;
  }

  // ? 5. DELETE
  @ActivityLog(
    ActivityAction.DELETE_ORGANIZATION_SUCCESS,
    ActivityAction.DELETE_ORGANIZATION_FAILED,
  )
  async delete(userId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (!(await this.isOwnerOrg(userId, orgId))) {
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

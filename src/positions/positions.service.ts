// src/positions/positions.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { ActivityAction } from '@/common/enums/activity-action.enum';
import { Request } from 'express';

@Injectable()
export class PositionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
  ) {}

  async create(
    orgId: string,
    userId: string,
    createPositionDto: CreatePositionDto,
    req?: Request,
  ) {
    const member = await this.checkMemberAccess(orgId, userId, req);

    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      await this.authUtils.createActivityLog(
        ActivityAction.NOT_ACCESS,
        userId,
        req,
        { reason: 'Insufficient permissions to create position' },
      );
      throw new ForbiddenException('Only OWNER or ADMIN can create positions');
    }

    const position = await this.prisma.position.create({
      data: {
        ...createPositionDto,
        organizationId: orgId,
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.CREATE_POSITION,
      userId,
      req,
      {
        positionId: position.id,
        title: position.title,
        reason: 'Create position successfully',
      },
    );

    return position;
  }

  async findAll(orgId: string, userId: string, req?: Request) {
    await this.checkMemberAccess(orgId, userId, req);

    const positions = await this.prisma.position.findMany({
      where: { organizationId: orgId },
      include: {
        employeePositions: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            employeePositions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.VIEW_POSITIONS,
      userId,
      req,
      {
        organizationId: orgId,
        count: positions.length,
        reason: 'View all positions successfully',
      },
    );

    return positions;
  }

  async findOne(id: string, userId: string, req?: Request) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        employeePositions: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!position) {
      await this.authUtils.createActivityLog(
        ActivityAction.POSITION_NOTFOUND,
        userId,
        req,
        { positionId: id },
      );
      throw new NotFoundException('Position not found');
    }

    await this.checkMemberAccess(
      position.organizationId as string,
      userId,
      req,
    );

    await this.authUtils.createActivityLog(
      ActivityAction.VIEW_POSITIONS,
      userId,
      req,
      {
        positionId: id,
        reason: 'View position details successfully',
      },
    );

    return position;
  }

  async update(
    id: string,
    userId: string,
    updatePositionDto: UpdatePositionDto,
    req?: Request,
  ) {
    const position = await this.prisma.position.findUnique({
      where: { id },
    });

    if (!position) {
      await this.authUtils.createActivityLog(
        ActivityAction.POSITION_NOTFOUND,
        userId,
        req,
        { positionId: id },
      );
      throw new NotFoundException('Position not found');
    }

    const member = await this.checkMemberAccess(
      position.organizationId as string,
      userId,
      req,
    );

    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      await this.authUtils.createActivityLog(
        ActivityAction.NOT_ACCESS,
        userId,
        req,
        { reason: 'Insufficient permissions to update position' },
      );
      throw new ForbiddenException('Only OWNER or ADMIN can update positions');
    }

    const updatedPosition = await this.prisma.position.update({
      where: { id },
      data: updatePositionDto,
    });

    await this.authUtils.createActivityLog(
      ActivityAction.UPDATE_POSITION,
      userId,
      req,
      { positionId: id, reason: 'Update position successfully' },
    );

    return updatedPosition;
  }

  async remove(id: string, userId: string, req?: Request) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employeePositions: true,
          },
        },
      },
    });

    if (!position) {
      await this.authUtils.createActivityLog(
        ActivityAction.POSITION_NOTFOUND,
        userId,
        req,
        { positionId: id, reason: 'Position not found' },
      );
      throw new NotFoundException('Position not found');
    }

    const member = await this.checkMemberAccess(
      position.organizationId as string,
      userId,
      req,
    );

    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      await this.authUtils.createActivityLog(
        ActivityAction.NOT_ACCESS,
        userId,
        req,
        { reason: 'Insufficient permissions to delete position' },
      );
      throw new ForbiddenException('Only OWNER or ADMIN can delete positions');
    }

    if (position._count.employeePositions > 0) {
      await this.authUtils.createActivityLog(
        ActivityAction.DELETE_POSITION_FAILED,
        userId,
        req,
        { positionId: id, reason: 'Position has assigned employees' },
      );
      throw new BadRequestException(
        'Cannot delete position with assigned employees',
      );
    }

    await this.prisma.position.delete({
      where: { id },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.DELETE_POSITION,
      userId,
      req,
      {
        positionId: id,
        title: position.title,
        reason: 'Delete position successfully',
      },
    );

    return { message: 'Position deleted successfully' };
  }

  async assignEmployeeToPosition(
    positionId: string,
    employeeId: string,
    userId: string,
    req?: Request,
  ) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.organizationId !== position.organizationId) {
      throw new BadRequestException(
        'Employee and position must belong to the same organization',
      );
    }

    const member = await this.checkMemberAccess(
      position.organizationId as string,
      userId,
      req,
    );

    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException(
        'Only OWNER or ADMIN can assign positions to employees',
      );
    }

    const existingAssignment = await this.prisma.employeePosition.findUnique({
      where: {
        employeeId_positionId: {
          employeeId,
          positionId,
        },
      },
    });

    if (existingAssignment) {
      throw new BadRequestException(
        'Employee already assigned to this position',
      );
    }

    const assignment = await this.prisma.employeePosition.create({
      data: {
        employeeId,
        positionId,
      },
      include: {
        employee: true,
        position: true,
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.ASSIGN_EMPLOYEE_TO_POSITION,
      userId,
      req,
      {
        employeeId,
        positionId,
        reason: 'Assigned position to employee successfully',
      },
    );

    return assignment;
  }

  async removeEmployeeFromPosition(
    positionId: string,
    employeeId: string,
    userId: string,
    req?: Request,
  ) {
    const assignment = await this.prisma.employeePosition.findUnique({
      where: {
        employeeId_positionId: {
          employeeId,
          positionId,
        },
      },
      include: {
        position: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const member = await this.checkMemberAccess(
      assignment.position.organizationId as string,
      userId,
      req,
    );

    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException(
        'Only OWNER or ADMIN can remove positions from employees',
      );
    }

    await this.prisma.employeePosition.delete({
      where: {
        employeeId_positionId: {
          employeeId,
          positionId,
        },
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.REMOVE_EMPLOYEE_FROM_POSITION,
      userId,
      req,
      {
        employeeId,
        positionId,
        reason: 'Removed position from employee successfully',
      },
    );

    return { message: 'Position removed from employee successfully' };
  }

  private async checkMemberAccess(
    orgId: string,
    userId: string,
    req?: Request,
  ) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member) {
      await this.authUtils.createActivityLog(
        ActivityAction.MEMBER_NOTFOUND,
        userId,
        req,
        { organizationId: orgId, reason: 'Member not found' },
      );
      throw new ForbiddenException('You are not a member of this organization');
    }

    return member;
  }
}

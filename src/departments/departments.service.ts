import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { ActivityAction } from '@/common/enums/activity-action.enum';
import { Request } from 'express';

@Injectable()
export class DepartmentsService {
  constructor(
    private prisma: PrismaService,
    private authUtils: AuthUtilsService,
  ) {}

  // ? helper
  async checkMember(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
    });

    if (!member) throw new ForbiddenException('Not a member');
    return member;
  }

  // ! CREATE
  async create(
    orgId: string,
    userId: string,
    dto: CreateDepartmentDto,
    req?: Request,
  ) {
    await this.checkMember(orgId, userId);

    const exist = await this.prisma.department.findFirst({
      where: {
        organizationId: orgId,
        name: dto.name,
      },
    });

    if (exist) {
      await this.authUtils.createActivityLog(
        ActivityAction.CREATE_DEPARTMENT_FAILED,
        userId,
        req,
        { reason: 'The department is already' },
      );
      throw new ConflictException('The department is already');
    }

    const department = await this.prisma.department.create({
      data: {
        name: dto.name,
        description: dto.description,
        organizationId: orgId,
      },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.CREATE_DEPARTMENT_SUCCESS,
      userId,
      req,
      { reason: 'Create department successfully' },
    );

    return department;
  }

  // ! GET ALL
  async findAll(orgId: string, userId: string, req?: Request) {
    await this.checkMember(orgId, userId);

    const departments = await this.prisma.department.findMany({
      where: { organizationId: orgId },
    });

    if (!departments || departments.length === 0) {
      await this.authUtils.createActivityLog(
        ActivityAction.GET_DEPARTMENTS_FAILED,
        userId,
        req,
        { reason: 'Departments any not found' },
      );
      throw new NotFoundException('Departments any not found');
    }

    await this.authUtils.createActivityLog(
      ActivityAction.GET_DEPARTMENTS_SUCCESS,
      userId,
      req,
      { reason: 'Get departments successfully' },
    );

    return departments;
  }

  // ! UPDATE
  async update(
    id: string,
    userId: string,
    dto: UpdateDepartmentDto,
    req?: Request,
  ) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      await this.authUtils.createActivityLog(
        ActivityAction.UPDATE_DEPARTMENT_FAILED,
        userId,
        req,
        { reason: 'Department not found' },
      );
      throw new NotFoundException('Department not found');
    }

    await this.checkMember(department.organizationId, userId);

    const newDepartment = await this.prisma.department.update({
      where: { id },
      data: dto,
    });

    await this.authUtils.createActivityLog(
      ActivityAction.UPDATE_DEPARTMENT_SUCCESS,
      userId,
      req,
      {
        departmentId: newDepartment.id,
        reason: 'Update department successfully',
      },
    );
    return newDepartment;
  }

  // ! DELETE
  async delete(id: string, userId: string, req?: Request) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      await this.authUtils.createActivityLog(
        ActivityAction.DELETE_DEPARTMENT_FAILED,
        userId,
        req,
        { reason: 'Department not found' },
      );
      throw new NotFoundException('Department not found');
    }

    await this.checkMember(department.organizationId, userId);

    await this.prisma.department.delete({
      where: { id },
    });

    await this.authUtils.createActivityLog(
      ActivityAction.DELETE_DEPARTMENT_SUCCESS,
      userId,
      req,
      { reason: 'Department deleted' },
    );

    return { message: 'Department deleted' };
  }
}

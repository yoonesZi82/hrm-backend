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
import { ActivityLog } from '@/common/decorators/activity-log.decorator';

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
  @ActivityLog(
    ActivityAction.CREATE_DEPARTMENT_SUCCESS,
    ActivityAction.CREATE_DEPARTMENT_FAILED,
  )
  async create(orgId: string, userId: string, dto: CreateDepartmentDto) {
    await this.checkMember(orgId, userId);

    const exist = await this.prisma.department.findFirst({
      where: {
        organizationId: orgId,
        name: dto.name,
      },
    });

    if (exist) {
      throw new ConflictException('The department is already');
    }

    const department = await this.prisma.department.create({
      data: {
        name: dto.name,
        description: dto.description,
        organizationId: orgId,
      },
    });

    return department;
  }

  // ! GET ALL
  @ActivityLog(
    ActivityAction.GET_DEPARTMENTS_SUCCESS,
    ActivityAction.GET_DEPARTMENTS_FAILED,
  )
  async findAll(orgId: string, userId: string) {
    await this.checkMember(orgId, userId);

    const departments = await this.prisma.department.findMany({
      where: { organizationId: orgId },
    });

    if (!departments || departments.length === 0) {
      throw new NotFoundException('Departments any not found');
    }

    return departments;
  }

  // ! UPDATE
  @ActivityLog(
    ActivityAction.UPDATE_DEPARTMENT_FAILED,
    ActivityAction.UPDATE_DEPARTMENT_SUCCESS,
  )
  async update(id: string, userId: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) throw new NotFoundException('Department not found');

    await this.checkMember(department.organizationId, userId);

    const updated = await this.prisma.department.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  // ! DELETE
  @ActivityLog(
    ActivityAction.DELETE_DEPARTMENT_FAILED,
    ActivityAction.DELETE_DEPARTMENT_SUCCESS,
  )
  async delete(id: string, userId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) throw new NotFoundException('Department not found');

    await this.checkMember(department.organizationId, userId);

    await this.prisma.department.delete({
      where: { id },
    });

    return { message: 'Department deleted' };
  }
}

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DepartmentsController {
  constructor(private service: DepartmentsService) {}

  // ! POST /organizations/:orgId/departments
  @Post('organizations/:orgId/departments')
  @ApiOperation({ summary: 'Create department' })
  @ApiParam({ name: 'orgId' })
  @ApiBody({ type: CreateDepartmentDto })
  create(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.service.create(orgId, userId, dto);
  }

  // ! GET /organizations/:orgId/departments
  @Get('organizations/:orgId/departments')
  @ApiOperation({ summary: 'Get departments list' })
  @ApiParam({ name: 'orgId' })
  findAll(@Param('orgId') orgId: string, @CurrentUser('id') userId: string) {
    return this.service.findAll(orgId, userId);
  }

  // ! PATCH /departments/:id
  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update department' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateDepartmentDto })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.service.update(id, userId, dto);
  }

  // ! DELETE /departments/:id
  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete department' })
  @ApiParam({ name: 'id' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }
}

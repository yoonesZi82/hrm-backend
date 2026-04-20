import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { PermissionsService } from './permission.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto';
import { OrgRole } from '@/common/enums/org-role.enum';

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(
    private service: PermissionsService,
    private authUtils: AuthUtilsService,
  ) {}

  // ! POST /permissions
  @Post()
  @ApiOperation({ summary: 'Create permission' })
  @ApiBody({ type: CreatePermissionDto })
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.service.createPermission(dto);
  }

  // ! POST /roles/:role/permissions
  @Post('roles/:role/permissions')
  @ApiOperation({ summary: 'Assign permission to role' })
  @ApiParam({ name: 'role', enum: OrgRole })
  @ApiBody({ type: AssignRolePermissionDto })
  assignPermissionToRole(
    @Param('role') role: OrgRole,
    @Body() dto: AssignRolePermissionDto,
  ) {
    return this.service.assignPermissionToRole(role, dto.permissionId);
  }

  // ! GET /roles/:role/permissions
  @Get('roles/:role/permissions')
  @ApiOperation({ summary: 'Get role permissions' })
  @ApiParam({ name: 'role', enum: OrgRole })
  getRolePermissions(
    @Param('role') role: OrgRole,
    @CurrentUser('id') userId: string,
    @Req() req?: Request,
  ) {
    return this.service.getRolePermissions(role, userId, req);
  }

  // ! GET /permissions
  @Get()
  @ApiOperation({ summary: 'Get all permissions' })
  getAllPermissions() {
    return this.service.getAllPermissions();
  }

  // ! DELETE /permissions/roles/:role/permissions/:permissionId
  @Delete('roles/:role/permissions/:permissionId')
  @ApiOperation({ summary: 'Remove permission from role' })
  @ApiParam({ name: 'role', enum: OrgRole })
  removePermissionFromRole(
    @Param('role') role: OrgRole,
    @Param('permissionId') permissionId: string,
  ) {
    return this.service.removePermissionFromRole(role, permissionId);
  }

  // ! DELETE /permissions/:permissionId
  @Delete(':permissionId')
  @ApiOperation({ summary: 'Delete permission' })
  deletePermission(@Param('permissionId') permissionId: string) {
    return this.service.deletePermission(permissionId);
  }
}

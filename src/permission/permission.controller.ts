import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
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
import { OrgRole } from '@/common/enums/permission.enum';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto';

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
  createPermission(
    @Body() dto: CreatePermissionDto,
    @CurrentUser('id') userId: string,
    @Req() req?: Request,
  ) {
    return this.service.createPermission(dto, userId, req);
  }

  // ! POST /roles/:role/permissions
  @Post('roles/:role/permissions')
  @ApiOperation({ summary: 'Assign permission to role' })
  @ApiParam({ name: 'role', enum: OrgRole })
  @ApiBody({ type: AssignRolePermissionDto })
  assignPermissionToRole(
    @Param('role') role: OrgRole,
    @Body() dto: AssignRolePermissionDto,
    @CurrentUser('id') userId: string,
    @Req() req?: Request,
  ) {
    return this.service.assignPermissionToRole(
      role,
      dto.permissionId,
      userId,
      req,
    );
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
}

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AssignUserPermissionDto } from './dto/assign-user-permission.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UserPermissionsService } from './users-permission.service';
import { Permissions } from '@/common/decorators/permissions.decorator';

@ApiTags('User Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Permissions('ASSIGN_PERMISSION')
@Controller('users/:userId/permissions')
export class UserPermissionsController {
  constructor(private service: UserPermissionsService) {}

  // ! POST /users/:userId/permissions
  @Post()
  @ApiOperation({ summary: 'Assign permission to user' })
  @ApiParam({ name: 'userId' })
  @ApiBody({ type: AssignUserPermissionDto })
  assignPermission(
    @Param('userId') userId: string,
    @Body() dto: AssignUserPermissionDto,
  ) {
    return this.service.assignPermission(userId, dto.permissionId);
  }

  // ! GET /users/:userId/permissions
  @Get()
  @ApiOperation({ summary: 'Get user permissions' })
  getUserPermissions(@Param('userId') userId: string) {
    return this.service.getUserPermissions(userId);
  }

  // ! DELETE /users/:userId/permissions/:permissionId
  @Delete(':permissionId')
  @ApiOperation({ summary: 'Remove permission from user' })
  removeUserPermission(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.service.removeUserPermission(userId, permissionId);
  }
}

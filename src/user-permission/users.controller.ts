import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AssignUserPermissionDto } from './dto/assign-user-permission.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UserPermissionsService } from './users.service';
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
    @CurrentUser('id') currentUserId: string,
    @Req() req?: Request,
  ) {
    return this.service.assignPermission(
      userId,
      dto.permissionId,
      currentUserId,
      req,
    );
  }

  // ! GET /users/:userId/permissions
  @Get()
  @ApiOperation({ summary: 'Get user permissions' })
  getUserPermissions(
    @Param('userId') userId: string,
    @CurrentUser('id') currentUserId: string,
    @Req() req?: Request,
  ) {
    return this.service.getUserPermissions(userId, currentUserId, req);
  }

  // ! DELETE /users/:userId/permissions/:permissionId
  @Delete(':permissionId')
  @ApiOperation({ summary: 'Remove permission from user' })
  removeUserPermission(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser('id') currentUserId: string,
    @Req() req?: Request,
  ) {
    return this.service.removeUserPermission(
      userId,
      permissionId,
      currentUserId,
      req,
    );
  }
}

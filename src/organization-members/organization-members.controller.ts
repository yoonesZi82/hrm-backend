import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrganizationMembersService } from './organization-members.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { AppPermission } from '@/common/enums/permission.enum';

import { AddMemberDto } from './dto/add-member.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Request } from 'express';

@ApiTags('Organization Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('organizations/:orgId/members')
export class OrganizationMembersController {
  constructor(private service: OrganizationMembersService) {}

  // ! ADD MEMBER
  @Post()
  @ApiOperation({ summary: 'Add member' })
  @ApiParam({ name: 'orgId' })
  @ApiBody({ type: AddMemberDto })
  @Permissions(AppPermission.ADD_MEMBER)
  addMember(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
    @Body() dto: AddMemberDto,
    @Req() req: Request,
  ) {
    return this.service.addMember(userId, orgId, dto, req);
  }

  // ! GET MEMBERS
  @Get()
  @ApiOperation({ summary: 'Get members list' })
  @Permissions(AppPermission.VIEW_MEMBERS)
  getMembers(@CurrentUser('id') userId: string, @Param('orgId') orgId: string) {
    return this.service.getMembers(userId, orgId);
  }

  // ! UPDATE ROLE
  @Patch(':memberUserId')
  @ApiOperation({ summary: 'Update member role' })
  @Permissions(AppPermission.UPDATE_MEMBER_ROLE)
  updateRole(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
    @Param('memberUserId') memberUserId: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    return this.service.updateRole(userId, orgId, memberUserId, dto, req);
  }

  // ! REMOVE MEMBER
  @Delete(':memberUserId')
  @ApiOperation({ summary: 'Remove member' })
  @Permissions(AppPermission.REMOVE_MEMBER)
  removeMember(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
    @Param('memberUserId') memberUserId: string,
    @Req() req: Request,
  ) {
    return this.service.removeMember(userId, orgId, memberUserId, req);
  }
}

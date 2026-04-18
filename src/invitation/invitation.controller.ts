import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { InvitationsService } from './invitation.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/invitations')
export class InvitationsController {
  constructor(private service: InvitationsService) {}

  // ! SEND INVITE
  @Post()
  @ApiOperation({ summary: 'Create invitation' })
  create(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
    @Body() dto: CreateInvitationDto,
    @Req() req?: Request,
  ) {
    return this.service.createInvitation(
      userId,
      orgId,
      dto.email,
      dto.role,
      req,
    );
  }

  // ! GET INVITES
  @Get()
  getAll(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
  ) {
    return this.service.getInvitations(userId, orgId);
  }

  // ! ACCEPT
  @Post('/accept')
  @ApiOperation({ summary: 'Accept invitation' })
  accept(
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptInvitationDto,
    @Req() req?: Request,
  ) {
    return this.service.acceptInvitation(userId, dto.token, req);
  }

  // ! REVOKE
  @Patch(':invitationId/revoke')
  revoke(
    @CurrentUser('id') userId: string,
    @Param('invitationId') invitationId: string,
    @Req() req?: Request,
  ) {
    return this.service.revokeInvitation(userId, invitationId, req);
  }
}
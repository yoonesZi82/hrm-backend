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
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private service: OrganizationsService) {}

  // ? CREATE
  @Post()
  @ApiOperation({ summary: 'Create organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({ status: 201, description: 'Organization created' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto,
    @Req() req: Request,
  ) {
    return this.service.create(userId, dto, req);
  }

  // ? GET
  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', example: '65f1a2b3c4d5' })
  @ApiResponse({ status: 200, description: 'Organization found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  get(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.service.findById(userId, id, req);
  }

  // ? UPDATE
  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', example: '65f1a2b3c4d5' })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  @ApiResponse({ status: 403, description: 'No permission' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @Req() req: Request,
  ) {
    return this.service.update(userId, id, dto, req);
  }

  // ? DELETE
  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiParam({ name: 'id', example: '65f1a2b3c4d5' })
  @ApiResponse({ status: 200, description: 'Organization deleted' })
  @ApiResponse({ status: 403, description: 'Only owner can delete' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.service.delete(userId, id, req);
  }
}

// src/positions/positions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionResponseDto } from './dto/position-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@ApiTags('Positions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post('organizations/:orgId/positions')
  @ApiOperation({ summary: 'Create a new position' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: 201,
    description: 'Position created successfully',
    type: PositionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
    @Body() createPositionDto: CreatePositionDto,
    @Req() req: Request,
  ) {
    return this.positionsService.create(orgId, userId, createPositionDto, req);
  }

  @Get('organizations/:orgId/positions')
  @ApiOperation({ summary: 'Get all positions in organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'List of positions',
    type: [PositionResponseDto],
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
    @Req() req: Request,
  ) {
    return this.positionsService.findAll(orgId, userId, req);
  }

  @Get('positions/:id')
  @ApiOperation({ summary: 'Get a single position by ID' })
  @ApiParam({ name: 'id', description: 'Position ID' })
  @ApiResponse({
    status: 200,
    description: 'Position details',
    type: PositionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Position not found' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.positionsService.findOne(id, userId, req);
  }

  @Patch('positions/:id')
  @ApiOperation({ summary: 'Update a position' })
  @ApiParam({ name: 'id', description: 'Position ID' })
  @ApiResponse({
    status: 200,
    description: 'Position updated successfully',
    type: PositionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Position not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updatePositionDto: UpdatePositionDto,
    @Req() req: Request,
  ) {
    return this.positionsService.update(id, userId, updatePositionDto, req);
  }

  @Delete('positions/:id')
  @ApiOperation({ summary: 'Delete a position' })
  @ApiParam({ name: 'id', description: 'Position ID' })
  @ApiResponse({ status: 200, description: 'Position deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Position has assigned employees and cannot be deleted',
  })
  @ApiResponse({ status: 404, description: 'Position not found' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.positionsService.remove(id, userId, req);
  }

  @Post('positions/:positionId/employees/:employeeId')
  @ApiOperation({ summary: 'Assign a position to an employee' })
  @ApiParam({ name: 'positionId', description: 'Position ID' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({
    status: 201,
    description: 'Position assigned to employee successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Position or employee not found' })
  async assignEmployee(
    @CurrentUser('id') userId: string,
    @Param('positionId') positionId: string,
    @Param('employeeId') employeeId: string,
    @Req() req: Request,
  ) {
    return this.positionsService.assignEmployeeToPosition(
      positionId,
      employeeId,
      userId,
      req,
    );
  }

  @Delete('positions/:positionId/employees/:employeeId')
  @ApiOperation({ summary: 'Remove a position from an employee' })
  @ApiParam({ name: 'positionId', description: 'Position ID' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Position removed from employee successfully',
  })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeEmployee(
    @CurrentUser('id') userId: string,
    @Param('positionId') positionId: string,
    @Param('employeeId') employeeId: string,
    @Req() req: Request,
  ) {
    return this.positionsService.removeEmployeeFromPosition(
      positionId,
      employeeId,
      userId,
      req,
    );
  }
}

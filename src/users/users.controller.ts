import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaginatedUsersDto } from './dto/paginated-users.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  // ! GET /users
  @Get()
  @ApiOperation({ summary: 'Get users list (paginated)' })
  @ApiOkResponse({ type: PaginatedUsersDto })
  getAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryUsersDto,
    @Req() req: Request,
  ) {
    return this.service.getAllUsers(query, userId, req);
  }

  // ! GET /users/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: UserResponseDto })
  getById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.service.getUserById(id, userId, req);
  }

  // ! PATCH /users/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.service.updateUser(id, dto, userId, req);
  }

  // ! DELETE /users/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete user (suspend)' })
  @ApiParam({ name: 'id' })
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    return this.service.deleteUser(id, userId, req);
  }
}

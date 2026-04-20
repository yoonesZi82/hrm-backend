import { Module } from '@nestjs/common';
import { UserPermissionsController } from './users-permission.controller';
import { UserPermissionsService } from './users-permission.service';
import { AuthModule } from '@/auth/auth.module';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [UserPermissionsController],
  providers: [UserPermissionsService, PrismaService, AuthUtilsService],
})
export class UsersPermissionModule {}

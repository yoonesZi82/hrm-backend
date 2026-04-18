import { Module } from '@nestjs/common';
import { UserPermissionsController } from './users.controller';
import { UserPermissionsService } from './users.service';
import { AuthModule } from '@/auth/auth.module';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [UserPermissionsController],
  providers: [UserPermissionsService, PrismaService, AuthUtilsService],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { PermissionsController } from './permission.controller';
import { PermissionsService } from './permission.service';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { PermissionBootstrapService } from './permission-bootstrap.service';

@Module({
  imports: [AuthModule],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    PrismaService,
    AuthUtilsService,
    PermissionBootstrapService,
  ],
})
export class PermissionModule {}

import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { PermissionBootstrapService } from '@/permission/permission-bootstrap.service';

@Module({
  imports: [AuthModule],
  controllers: [DepartmentsController],
  providers: [
    DepartmentsService,
    PrismaService,
    AuthUtilsService,
    PermissionBootstrapService,
  ],
})
export class DepartmentsModule {}

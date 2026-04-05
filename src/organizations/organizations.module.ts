import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PrismaService, AuthUtilsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}

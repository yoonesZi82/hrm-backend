import { Module } from '@nestjs/common';
import { OrganizationMembersService } from './organization-members.service';
import { OrganizationMembersController } from './organization-members.controller';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationMembersController],
  providers: [OrganizationMembersService, PrismaService, AuthUtilsService],
})
export class OrganizationMembersModule {}

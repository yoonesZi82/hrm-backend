import { Module } from '@nestjs/common';
import { InvitationsController } from './invitation.controller';
import { InvitationsService } from './invitation.service';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';

@Module({
  imports: [AuthModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, PrismaService, AuthUtilsService],
})
export class InvitationModule {}

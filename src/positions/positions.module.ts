import { Module } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { PositionsController } from './positions.controller';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';

@Module({
  imports: [AuthModule],
  controllers: [PositionsController],
  providers: [PositionsService, PrismaService, AuthUtilsService],
})
export class PositionsModule {}

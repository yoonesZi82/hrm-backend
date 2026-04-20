import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';

@Module({
  imports: [AuthModule],

  controllers: [UsersController],
  providers: [UsersService, PrismaService, AuthUtilsService],
})
export class UsersModule {}

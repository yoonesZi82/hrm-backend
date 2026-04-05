// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthUtilsService } from '@/lib/auth-utils/auth-utils.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: Number(process.env.JWT_EXPIRES_IN) },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthUtilsService],
  exports: [AuthService, AuthUtilsService, JwtModule],
})
export class AuthModule {}

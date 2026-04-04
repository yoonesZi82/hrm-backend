import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: '09012345678',
    description: 'User mobile number',
  })
  @IsString()
  mobile!: string;

  @ApiPropertyOptional({
    example: 'test@gmail.com',
    description: 'User email (optional)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'User password',
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({
    example: 'EMPLOYEE',
    enum: [Role],
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

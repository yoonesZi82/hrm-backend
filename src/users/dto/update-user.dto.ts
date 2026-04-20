import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'test@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '09123456789' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ example: '123456', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

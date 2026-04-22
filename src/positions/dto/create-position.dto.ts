// src/positions/dto/create-position.dto.ts
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({
    example: 'Senior Backend Developer',
    description: 'Position title',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional({
    example: 'Senior backend developer specialized in NestJS',
    description: 'Position description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

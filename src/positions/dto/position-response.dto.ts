// src/positions/dto/position-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PositionResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: 'Senior Backend Developer' })
  title!: string;

  @ApiPropertyOptional({
    example: 'Senior backend developer specialized in NestJS',
  })
  description?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  organizationId!: string;

  @ApiProperty({ example: '2026-04-22T10:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-22T10:30:00.000Z' })
  updatedAt!: Date;
}

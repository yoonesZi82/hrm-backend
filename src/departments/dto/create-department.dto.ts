import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Engineering' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Handles all tech stuff', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

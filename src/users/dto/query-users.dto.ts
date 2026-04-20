import { IsOptional, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryUsersDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

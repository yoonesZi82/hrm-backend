import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'test' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

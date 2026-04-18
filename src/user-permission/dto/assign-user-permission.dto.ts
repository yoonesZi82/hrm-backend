import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignUserPermissionDto {
  @ApiProperty({
    description: 'Permission id to assign to the role',
    example: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  permissionId: string;
}

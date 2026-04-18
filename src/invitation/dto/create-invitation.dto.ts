import { IsEmail, IsEnum } from 'class-validator';
import { OrgRole } from '@/common/enums/permission.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Enter Email',
    example: 'test@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Enter Role',
    example: OrgRole.ADMIN,
  })
  @IsEnum(OrgRole)
  role: OrgRole;
}

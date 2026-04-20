import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrgRole } from '@/common/enums/org-role.enum';

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

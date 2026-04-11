import { MemberRole } from '@/common/enums/member-role.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsEnum } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({ example: '65f1a2b3c4d5' })
  @IsMongoId()
  userId: string;

  @ApiProperty({ enum: MemberRole, example: MemberRole.EMPLOYEE })
  @IsEnum(MemberRole)
  role: MemberRole;
}

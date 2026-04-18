import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Enter Token',
    example: 'sdv,jabvkabvkjbasbvkajsbv',
  })
  @IsString()
  token: string;
}

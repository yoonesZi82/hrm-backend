import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  mobile!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;
}

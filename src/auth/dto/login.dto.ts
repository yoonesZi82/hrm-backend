import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '09012345678',
  })
  @IsString()
  mobile!: string;

  @ApiProperty({
    example: 'StrongPass123!',
  })
  @IsString()
  password!: string;
}

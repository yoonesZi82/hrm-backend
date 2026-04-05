import { IsString, IsOptional, IsHexColor, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'My Company' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'my-company' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase and kebab-case',
  })
  slug: string;

  @ApiProperty({ example: 'mycompany.com', required: false })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty({ example: '#FF0000', required: false })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;
}

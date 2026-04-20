import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

class MetaDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedUsersDto {
  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiProperty({ type: MetaDto })
  meta!: MetaDto;
}

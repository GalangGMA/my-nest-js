import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh-token-value' })
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}

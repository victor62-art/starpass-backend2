import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCreatorDto {
  @ApiProperty({ description: 'Display name shown to fans' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ description: 'Creator bio' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'Avatar image URL' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

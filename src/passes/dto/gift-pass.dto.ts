import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class GiftPassDto {
  @ApiProperty({ description: 'UUID of the tier to gift' })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  tierId: string;

  @ApiProperty({ description: 'Stellar public key of the gift recipient' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z2-7]{55}$/, {
    message: 'recipientAddress must be a valid Stellar public key',
  })
  recipientAddress: string;
}

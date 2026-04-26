import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Name', example: 'Tea Kettle' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @ApiProperty({
    description: 'Model (optional)',
    example: 'Raspberry Pi 3B+',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Model cannot exceed 100 characters' })
  model?: string;

  @ApiProperty({
    description: 'Firmware version (optional)',
    example: '1.0.0',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Firmware version cannot exceed 50 characters' })
  firmware_version?: string;

  @ApiProperty({
    description: 'Public key (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  public_key?: string;
}

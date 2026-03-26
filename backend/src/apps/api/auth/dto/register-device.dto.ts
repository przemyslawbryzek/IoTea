import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Name', example: 'Tea Kettle' })
  name: string;

  @ApiProperty({
    description: 'Model (optional)',
    example: 'Raspberry Pi 3B+',
    required: false,
  })
  model?: string;

  @ApiProperty({
    description: 'Firmware version (optional)',
    example: '1.0.0',
    required: false,
  })
  firmware_version?: string;

  @ApiProperty({
    description: 'Public key (optional)',
    required: false,
  })
  public_key?: string;
}

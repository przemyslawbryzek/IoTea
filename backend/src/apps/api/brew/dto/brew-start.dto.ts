import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min, Max } from 'class-validator';

export class BrewStartDto {
  @ApiProperty({ description: 'The ID of the device', example: 1 })
  @IsNumber({}, { message: 'Device ID must be a number' })
  @IsPositive({ message: 'Device ID must be positive' })
  deviceId: number;

  @ApiProperty({ description: 'The ID of the brewing instruction', example: 1 })
  @IsNumber({}, { message: 'Instruction ID must be a number' })
  @IsPositive({ message: 'Instruction ID must be positive' })
  instructionId: number;

  @ApiProperty({
    description: 'The volume of water in milliliters',
    example: 200,
  })
  @IsNumber({}, { message: 'Volume must be a number' })
  @IsPositive({ message: 'Volume must be positive' })
  @Min(50, { message: 'Minimum volume is 50ml' })
  @Max(500, { message: 'Maximum volume is 500ml' })
  volumeMl: number;

  @ApiProperty({ description: 'The number of the brew', example: 1 })
  @IsNumber({}, { message: 'Brew number must be a number' })
  @IsPositive({ message: 'Brew number must be positive' })
  brewNumber: number;
}

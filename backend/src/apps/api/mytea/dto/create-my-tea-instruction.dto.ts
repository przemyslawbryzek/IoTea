import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class CreateMyTeaInstructionDto {
  @ApiProperty({ example: 1, description: 'Brewing style id' })
  @IsInt()
  @Min(1)
  declare styleId: number;

  @ApiProperty({ example: 4.5, description: 'Grams per 100ml' })
  @IsNumber()
  @Min(0.1)
  @Max(100)
  declare grams_per_100ml: number;

  @ApiProperty({ example: 30, description: 'First infusion in seconds' })
  @IsInt()
  @Min(1)
  declare first_infusion_seconds: number;

  @ApiProperty({ example: 5, description: 'Increment in seconds per infusion' })
  @IsInt()
  @Min(0)
  declare increment_seconds: number;

  @ApiProperty({ example: 6, description: 'Maximum number of infusions' })
  @IsInt()
  @Min(1)
  declare max_infusions: number;
}
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min, IsOptional } from 'class-validator';

export class CreateTeaDto {
  @ApiProperty({ example: 'Sencha' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: 'Japonska zielona herbata o swiezym smaku.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: 'https://example.com/sencha.jpg' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiProperty({ example: 80, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  brew_temp: number;
}

// @ts-nocheck
import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateMyTeaDto {
  constructor() {
    this.name = '';
    this.categoryId = 1;
    this.brew_temp = 1;
  }

  @ApiProperty({ example: 'My Sencha' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: 'Moja ulubiona wersja senchy.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: 'https://example.com/my-sencha.jpg' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiProperty({ example: 75, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  brew_temp: number;
}

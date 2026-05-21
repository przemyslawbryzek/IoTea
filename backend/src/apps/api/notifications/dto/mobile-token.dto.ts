import { IsNotEmpty, IsString } from 'class-validator';

export class MobileTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  platform: string;
}

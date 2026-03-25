import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'test@example.com' })
  email: string;

  @ApiProperty({ example: 'Pass1234!' })
  password: string;

  @ApiProperty({ required: false, example: 'Jan Kowalski' })
  name?: string;
}

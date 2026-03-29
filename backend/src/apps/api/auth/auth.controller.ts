import { Controller, Request, Post, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from './decorators/user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Register new user' })
  @ApiBody({ type: RegisterDto })
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password, body.name);
  }

  @ApiOperation({ summary: 'Login and get JWT token' })
  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
  @ApiOperation({ summary: 'Register device' })
  @ApiBody({ type: RegisterDeviceDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('device/register')
  async registerDevice(
    @Body() registerDeviceDto: RegisterDeviceDto,
    @User() user: { id: number; email: string; name: string; role: string },
  ) {
    return this.authService.registerDevice(user.id, registerDeviceDto.name);
  }
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @Post('refresh')
  async refresh(@Body() { refresh_token }: RefreshTokenDto) {
    return this.authService.refreshToken(refresh_token);
  }
}

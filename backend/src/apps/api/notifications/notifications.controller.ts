import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { NotificationsService } from '../../notifications/notifications.service';
import { MobileTokenDto } from './dto/mobile-token.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Register mobile push token' })
  @ApiBody({ type: MobileTokenDto })
  @Post('mobile/token')
  async registerMobileToken(
    @User('id') userId: number,
    @Body() body: MobileTokenDto,
  ) {
    await this.notificationsService.upsertMobileToken(userId, body);
    return { ok: true };
  }

  @ApiOperation({ summary: 'Remove mobile push token' })
  @ApiBody({ type: MobileTokenDto })
  @Post('mobile/token/remove')
  async removeMobileToken(
    @User('id') userId: number,
    @Body() body: MobileTokenDto,
  ) {
    await this.notificationsService.removeMobileToken(userId, body.token);
    return { ok: true };
  }
}

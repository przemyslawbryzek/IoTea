import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { DeviceService } from './device.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  getAll(@User() user: { id: number }) {
    return this.deviceService.getAllByUser(user.id);
  }

  @Get(':id')
  getOne(@User() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.deviceService.getOne(user.id, id);
  }

  @Get(':id/status')
  getStatus(
    @User() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.deviceService.getStatus(user.id, id);
  }
}

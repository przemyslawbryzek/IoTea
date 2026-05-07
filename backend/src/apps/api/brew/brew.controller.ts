import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceOwnerGuard } from '../auth/guards/device-owner.guard';
import { User } from '../auth/decorators/user.decorator';
import { BrewService } from './brew.service';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { BrewStartDto } from './dto/brew-start.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('brews')
export class BrewController {
  constructor(private readonly brewService: BrewService) {}

  @ApiOperation({ summary: 'Get all brews for the authenticated user' })
  @Get()
  getAll(@User() user: { id: number }) {
    return this.brewService.getAllByUser(user.id);
  }
  @ApiOperation({ summary: 'Get details of a specific brew' })
  @Get(':id')
  getOne(@User() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.brewService.getOne(user.id, id);
  }
  @ApiOperation({ summary: 'Get the status of a brew' })
  @Get(':id/status')
  getStatus(
    @User() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.brewService.getStatus(user.id, id);
  }

  @ApiOperation({ summary: 'Get brew status history' })
  @Get(':id/history')
  getHistory(
    @User() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.brewService.getHistory(user.id, id);
  }
  @ApiOperation({ summary: 'Start a new brew' })
  @ApiBody({ type: BrewStartDto })
  @Post('/start')
  @UseGuards(DeviceOwnerGuard)
  startBrew(@User() user: { id: number }, @Body() brewStartDto: BrewStartDto) {
    return this.brewService.startBrew(user.id, brewStartDto);
  }
}

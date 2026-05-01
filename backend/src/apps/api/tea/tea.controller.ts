import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TeaService } from './tea.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tea')
export class TeaController {
  constructor(private readonly teaService: TeaService) {}

  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  getTea(@User('id') userId?: number) {
    return this.teaService.getTea(userId);
  }

  @Get('category')
  getCategory() {
    return this.teaService.getCategory();
  }

  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('category/:id')
  getTeaByCategory(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId?: number,
  ) {
    return this.teaService.getTeaByCategory(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  getTeaById(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId?: number,
  ) {
    return this.teaService.getTeaById(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/favorite')
  addFavorite(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('source') source: 'base' | 'user',
  ) {
    return this.teaService.setFavorite(userId, id, source, true);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id/favorite')
  removeFavorite(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('source') source: 'base' | 'user',
  ) {
    return this.teaService.setFavorite(userId, id, source, false);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/rating')
  setRating(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('source') source: 'base' | 'user',
    @Body('value', ParseIntPipe) value: number,
  ) {
    return this.teaService.setRating(userId, id, source, value);
  }
}

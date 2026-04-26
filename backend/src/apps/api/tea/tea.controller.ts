import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TeaService } from './tea.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

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
}

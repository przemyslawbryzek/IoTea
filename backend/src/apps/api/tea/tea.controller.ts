import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { TeaService } from './tea.service';
import { CreateTeaDto } from './dto/create-tea.dto';
import { UpdateTeaDto } from './dto/update-tea.dto';

@Controller('tea')
export class TeaController {
  constructor(private readonly teaService: TeaService) {}

  @Post()
  createTea(@Body() body: CreateTeaDto) {
    return this.teaService.createTea(body);
  }

  @Get()
  getTea() {
    return this.teaService.getTea();
  }

  @Get('category')
  getCategory() {
    return this.teaService.getCategory();
  }

  @Get('category/:id')
  getTeaByCategory(@Param('id', ParseIntPipe) id: number) {
    return this.teaService.getTeaByCategory(id);
  }

  @Get(':id')
  getTeaById(@Param('id', ParseIntPipe) id: number) {
    return this.teaService.getTeaById(id);
  }

  @Put(':id')
  updateTea(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTeaDto,
  ) {
    return this.teaService.updateTea(id, body);
  }

  @Delete(':id')
  deleteTea(@Param('id', ParseIntPipe) id: number) {
    return this.teaService.deleteTea(id);
  }
}

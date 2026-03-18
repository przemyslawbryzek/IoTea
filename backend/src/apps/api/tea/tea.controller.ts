import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TeaService } from './tea.service';

@Controller('tea')
export class TeaController {
  constructor(private readonly teaService: TeaService) {}

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
}

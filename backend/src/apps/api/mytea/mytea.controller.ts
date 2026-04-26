import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { MyTeaService } from './mytea.service';
import { CreateMyTeaDto } from './dto/create-my-tea.dto';
import { CreateMyTeaInstructionDto } from './dto/create-my-tea-instruction.dto';
import { UpdateMyTeaDto } from './dto/update-my-tea.dto';
import { UpdateMyTeaInstructionDto } from './dto/update-my-tea-instruction.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mytea')
export class MyTeaController {
  constructor(private readonly myTeaService: MyTeaService) {}

  @Post()
  createTea(@User('id') userId: number, @Body() body: CreateMyTeaDto) {
    return this.myTeaService.createTea(userId, body);
  }

  @Get()
  getMyTeas(@User('id') userId: number) {
    return this.myTeaService.getMyTeas(userId);
  }

  @Get('styles')
  getBrewingStyles() {
    return this.myTeaService.getBrewingStyles();
  }

  @Get(':id')
  getMyTeaById(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.myTeaService.getMyTeaById(userId, id);
  }

  @Put(':id')
  updateTea(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMyTeaDto,
  ) {
    return this.myTeaService.updateTea(userId, id, body);
  }

  @Delete(':id')
  deleteTea(@User('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.myTeaService.deleteTea(userId, id);
  }

  @Get(':teaId/instructions')
  getTeaInstructions(
    @User('id') userId: number,
    @Param('teaId', ParseIntPipe) teaId: number,
  ) {
    return this.myTeaService.getMyTeaInstructions(userId, teaId);
  }

  @Post(':teaId/instructions')
  createTeaInstruction(
    @User('id') userId: number,
    @Param('teaId', ParseIntPipe) teaId: number,
    @Body() body: CreateMyTeaInstructionDto,
  ) {
    return this.myTeaService.createMyTeaInstruction(userId, teaId, body);
  }

  @Get(':teaId/instructions/:instructionId')
  getTeaInstruction(
    @User('id') userId: number,
    @Param('teaId', ParseIntPipe) teaId: number,
    @Param('instructionId', ParseIntPipe) instructionId: number,
  ) {
    return this.myTeaService.getMyTeaInstruction(userId, teaId, instructionId);
  }

  @Put(':teaId/instructions/:instructionId')
  updateTeaInstruction(
    @User('id') userId: number,
    @Param('teaId', ParseIntPipe) teaId: number,
    @Param('instructionId', ParseIntPipe) instructionId: number,
    @Body() body: UpdateMyTeaInstructionDto,
  ) {
    return this.myTeaService.updateMyTeaInstruction(
      userId,
      teaId,
      instructionId,
      body,
    );
  }

  @Delete(':teaId/instructions/:instructionId')
  deleteTeaInstruction(
    @User('id') userId: number,
    @Param('teaId', ParseIntPipe) teaId: number,
    @Param('instructionId', ParseIntPipe) instructionId: number,
  ) {
    return this.myTeaService.deleteMyTeaInstruction(
      userId,
      teaId,
      instructionId,
    );
  }
}

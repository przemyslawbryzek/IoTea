import { Module } from '@nestjs/common';
import { TeaController } from './tea.controller';
import { TeaService } from './tea.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeaController],
  providers: [TeaService],
})
export class TeaModule {}

import { Module } from '@nestjs/common';
import { MyTeaController } from './mytea.controller';
import { MyTeaService } from './mytea.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [MyTeaController],
  providers: [MyTeaService],
  exports: [MyTeaService],
})
export class MyTeaModule {}

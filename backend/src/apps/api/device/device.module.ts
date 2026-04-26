import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EmqxModule } from '../emqx/emqx.module';

@Module({
  imports: [PrismaModule, RedisModule, EmqxModule],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { TeaModule } from './tea/tea.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, RedisModule, HealthModule, TeaModule, AuthModule],
})
export class ApiModule {}

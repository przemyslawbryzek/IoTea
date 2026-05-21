import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from 'redis';
import { NotificationsService } from '../notifications/notifications.service';

const PrismaProvider = {
  provide: 'PRISMA',
  useFactory: async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required');
    const adapter = new PrismaPg({ connectionString });
    const prisma = new PrismaClient({ adapter });
    await prisma.$connect();
    return prisma;
  },
};

const RedisProvider = {
  provide: 'REDIS',
  useFactory: async () => {
    const client = createClient({
      url: process.env.REDIS_URL ?? 'redis://redis:6379',
    });
    await client.connect();
    return client;
  },
};

const NotificationsProvider = {
  provide: NotificationsService,
  useFactory: (prisma: PrismaClient) => new NotificationsService(prisma),
  inject: ['PRISMA'],
};

@Module({
  providers: [PrismaProvider, RedisProvider, NotificationsProvider, WorkerService],
})
export class WorkerModule {}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TeaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}
  async getTea() {
    return this.redis.getOrSet('tea:all', 120, () =>
      this.prisma.tea.findMany({ include: { category: true } }),
    );
  }
  getTeaById(id: number) {
    return this.redis.getOrSet(`tea:${id}`, 120, () =>
      this.prisma.tea.findUnique({
        where: {
          id,
        },
        include: {
          category: true,
          instructions: {
            include: {
              style: true,
            },
          },
        },
      }),
    );
  }
  getCategory() {
    return this.redis.getOrSet('tea:categories', 120, () =>
      this.prisma.tea_category.findMany(),
    );
  }
  getTeaByCategory(id: number) {
    return this.redis.getOrSet(`tea:category:${id}`, 120, () =>
      this.prisma.tea.findMany({
        where: {
          categoryId: id,
        },
        include: {
          category: true,
        },
      }),
    );
  }
}

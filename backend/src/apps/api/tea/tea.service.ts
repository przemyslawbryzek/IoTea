import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

type TeaSource = 'base' | 'user';

type TeaListItem = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  categoryId: number;
  brew_temp: number;
  category: {
    id: number;
    name: string;
    icon_url: string | null;
  };
  source: TeaSource;
};

@Injectable()
export class TeaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getTea(userId?: number): Promise<TeaListItem[]> {
    const baseTeas = await this.redis.getOrSet('tea:all', 120, () =>
      this.prisma.tea.findMany({ include: { category: true } }),
    );

    if (!userId) {
      return baseTeas.map((tea) => ({ ...tea, source: 'base' }));
    }

    const userTeas = await this.prisma.user_tea.findMany({
      where: { owner_id: userId },
      include: { category: true },
    });

    return [
      ...baseTeas.map((tea) => ({ ...tea, source: 'base' as const })),
      ...userTeas.map((tea) => ({ ...tea, source: 'user' as const })),
    ];
  }

  async getTeaById(id: number, userId?: number) {
    const baseTea = await this.redis.getOrSet(`tea:${id}`, 120, () =>
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

    if (baseTea) {
      return { ...baseTea, source: 'base' as const };
    }

    if (!userId) {
      return null;
    }

    const userTea = await this.prisma.user_tea.findFirst({
      where: {
        id,
        owner_id: userId,
      },
      include: {
        category: true,
        instructions: {
          include: {
            style: true,
          },
        },
      },
    });

    if (!userTea) {
      return null;
    }

    return { ...userTea, source: 'user' as const };
  }

  getCategory() {
    return this.redis.getOrSet('tea:categories', 120, () =>
      this.prisma.tea_category.findMany(),
    );
  }

  async getTeaByCategory(id: number, userId?: number): Promise<TeaListItem[]> {
    const baseTeas = await this.redis.getOrSet(`tea:category:${id}`, 120, () =>
      this.prisma.tea.findMany({
        where: {
          categoryId: id,
        },
        include: {
          category: true,
        },
      }),
    );

    if (!userId) {
      return baseTeas.map((tea) => ({ ...tea, source: 'base' }));
    }

    const userTeas = await this.prisma.user_tea.findMany({
      where: {
        categoryId: id,
        owner_id: userId,
      },
      include: {
        category: true,
      },
    });

    return [
      ...baseTeas.map((tea) => ({ ...tea, source: 'base' as const })),
      ...userTeas.map((tea) => ({ ...tea, source: 'user' as const })),
    ];
  }

  getInstructionById(id: number) {
    return this.redis.getOrSet(`tea:instruction:${id}`, 120, () =>
      this.prisma.brewing_instructions.findUnique({
        where: { id },
        include: {
          tea: {
            select: {
              brew_temp: true,
            },
          },
          userTea: {
            select: {
              brew_temp: true,
            },
          },
          style: true,
        },
      }),
    );
  }
}

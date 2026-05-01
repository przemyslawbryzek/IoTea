import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  rating_percent: number | null;
  is_favorite: boolean;
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

    const baseTeaIds = baseTeas.map((tea) => tea.id);
    const baseRatingMap = await this.getTeaRatingMap(baseTeaIds);
    const baseFavoriteSet = userId
      ? await this.getTeaFavoriteSet(userId, baseTeaIds)
      : new Set<number>();

    if (!userId) {
      return baseTeas.map((tea) => ({
        ...tea,
        source: 'base',
        rating_percent: baseRatingMap.get(tea.id) ?? null,
        is_favorite: false,
      }));
    }

    const userTeas = await this.prisma.user_tea.findMany({
      where: { owner_id: userId },
      include: { category: true },
    });

    const userTeaIds = userTeas.map((tea) => tea.id);
    const userRatingMap = await this.getUserTeaRatingMap(userTeaIds);
    const userFavoriteSet = await this.getUserTeaFavoriteSet(
      userId,
      userTeaIds,
    );

    return [
      ...baseTeas.map((tea) => ({
        ...tea,
        source: 'base' as const,
        rating_percent: baseRatingMap.get(tea.id) ?? null,
        is_favorite: baseFavoriteSet.has(tea.id),
      })),
      ...userTeas.map((tea) => ({
        ...tea,
        source: 'user' as const,
        rating_percent: userRatingMap.get(tea.id) ?? null,
        is_favorite: userFavoriteSet.has(tea.id),
      })),
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
      const rating_percent = await this.getTeaRatingPercent(id);
      const is_favorite = userId
        ? await this.isTeaFavorite(userId, id)
        : false;

      return { ...baseTea, source: 'base' as const, rating_percent, is_favorite };
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

    const rating_percent = await this.getUserTeaRatingPercent(id);
    const is_favorite = await this.isUserTeaFavorite(userId, id);

    return { ...userTea, source: 'user' as const, rating_percent, is_favorite };
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

    const baseTeaIds = baseTeas.map((tea) => tea.id);
    const baseRatingMap = await this.getTeaRatingMap(baseTeaIds);
    const baseFavoriteSet = userId
      ? await this.getTeaFavoriteSet(userId, baseTeaIds)
      : new Set<number>();

    if (!userId) {
      return baseTeas.map((tea) => ({
        ...tea,
        source: 'base',
        rating_percent: baseRatingMap.get(tea.id) ?? null,
        is_favorite: false,
      }));
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

    const userTeaIds = userTeas.map((tea) => tea.id);
    const userRatingMap = await this.getUserTeaRatingMap(userTeaIds);
    const userFavoriteSet = await this.getUserTeaFavoriteSet(
      userId,
      userTeaIds,
    );

    return [
      ...baseTeas.map((tea) => ({
        ...tea,
        source: 'base' as const,
        rating_percent: baseRatingMap.get(tea.id) ?? null,
        is_favorite: baseFavoriteSet.has(tea.id),
      })),
      ...userTeas.map((tea) => ({
        ...tea,
        source: 'user' as const,
        rating_percent: userRatingMap.get(tea.id) ?? null,
        is_favorite: userFavoriteSet.has(tea.id),
      })),
    ];
  }

  async setFavorite(
    userId: number,
    teaId: number,
    source: TeaSource,
    isFavorite: boolean,
  ) {
    const resolvedSource = this.parseTeaSource(source);

    if (resolvedSource === 'base') {
      await this.ensureBaseTeaExists(teaId);

      if (isFavorite) {
        await this.prisma.tea_favorite.upsert({
          where: { userId_teaId: { userId, teaId } },
          update: {},
          create: { userId, teaId },
        });
      } else {
        await this.prisma.tea_favorite.deleteMany({
          where: { userId, teaId },
        });
      }

      return { is_favorite: isFavorite };
    }

    await this.ensureUserTeaExists(userId, teaId);

    if (isFavorite) {
      await this.prisma.user_tea_favorite.upsert({
        where: { userId_userTeaId: { userId, userTeaId: teaId } },
        update: {},
        create: { userId, userTeaId: teaId },
      });
    } else {
      await this.prisma.user_tea_favorite.deleteMany({
        where: { userId, userTeaId: teaId },
      });
    }

    return { is_favorite: isFavorite };
  }

  async setRating(
    userId: number,
    teaId: number,
    source: TeaSource,
    value: number,
  ) {
    const resolvedSource = this.parseTeaSource(source);

    if (value !== 0 && value !== 1) {
      throw new BadRequestException('Rating value must be 0 or 1');
    }

    if (resolvedSource === 'base') {
      await this.ensureBaseTeaExists(teaId);

      await this.prisma.tea_rating.upsert({
        where: { userId_teaId: { userId, teaId } },
        update: { value },
        create: { userId, teaId, value },
      });

      const rating_percent = await this.getTeaRatingPercent(teaId);
      return { value, rating_percent };
    }

    await this.ensureUserTeaExists(userId, teaId);

    await this.prisma.user_tea_rating.upsert({
      where: { userId_userTeaId: { userId, userTeaId: teaId } },
      update: { value },
      create: { userId, userTeaId: teaId, value },
    });

    const rating_percent = await this.getUserTeaRatingPercent(teaId);
    return { value, rating_percent };
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

  private parseTeaSource(source?: string): TeaSource {
    if (source === 'base' || source === 'user') {
      return source;
    }

    throw new BadRequestException('source must be base or user');
  }

  private async ensureBaseTeaExists(teaId: number) {
    const tea = await this.prisma.tea.findUnique({
      where: { id: teaId },
      select: { id: true },
    });

    if (!tea) {
      throw new NotFoundException(`Tea ${teaId} not found`);
    }
  }

  private async ensureUserTeaExists(userId: number, teaId: number) {
    const tea = await this.prisma.user_tea.findFirst({
      where: { id: teaId, owner_id: userId },
      select: { id: true },
    });

    if (!tea) {
      throw new NotFoundException(`My tea ${teaId} not found`);
    }
  }

  private normalizeRatingPercent(avg: number | null): number | null {
    if (avg === null) {
      return null;
    }

    return Math.round(avg * 100);
  }

  private async getTeaRatingPercent(teaId: number) {
    const result = await this.prisma.tea_rating.aggregate({
      where: { teaId },
      _avg: { value: true },
    });

    return this.normalizeRatingPercent(
      result._avg.value === null ? null : Number(result._avg.value),
    );
  }

  private async getUserTeaRatingPercent(userTeaId: number) {
    const result = await this.prisma.user_tea_rating.aggregate({
      where: { userTeaId },
      _avg: { value: true },
    });

    return this.normalizeRatingPercent(
      result._avg.value === null ? null : Number(result._avg.value),
    );
  }

  private async getTeaRatingMap(teaIds: number[]) {
    if (teaIds.length === 0) {
      return new Map<number, number>();
    }

    const grouped = await this.prisma.tea_rating.groupBy({
      by: ['teaId'],
      where: { teaId: { in: teaIds } },
      _avg: { value: true },
    });

    return new Map(
      grouped.map((entry) => [
        entry.teaId,
        this.normalizeRatingPercent(
          entry._avg.value === null ? null : Number(entry._avg.value),
        ),
      ]),
    );
  }

  private async getUserTeaRatingMap(userTeaIds: number[]) {
    if (userTeaIds.length === 0) {
      return new Map<number, number>();
    }

    const grouped = await this.prisma.user_tea_rating.groupBy({
      by: ['userTeaId'],
      where: { userTeaId: { in: userTeaIds } },
      _avg: { value: true },
    });

    return new Map(
      grouped.map((entry) => [
        entry.userTeaId,
        this.normalizeRatingPercent(
          entry._avg.value === null ? null : Number(entry._avg.value),
        ),
      ]),
    );
  }

  private async getTeaFavoriteSet(userId: number, teaIds: number[]) {
    if (teaIds.length === 0) {
      return new Set<number>();
    }

    const favorites = await this.prisma.tea_favorite.findMany({
      where: { userId, teaId: { in: teaIds } },
      select: { teaId: true },
    });

    return new Set(favorites.map((favorite) => favorite.teaId));
  }

  private async getUserTeaFavoriteSet(userId: number, userTeaIds: number[]) {
    if (userTeaIds.length === 0) {
      return new Set<number>();
    }

    const favorites = await this.prisma.user_tea_favorite.findMany({
      where: { userId, userTeaId: { in: userTeaIds } },
      select: { userTeaId: true },
    });

    return new Set(favorites.map((favorite) => favorite.userTeaId));
  }

  private async isTeaFavorite(userId: number, teaId: number) {
    const favorite = await this.prisma.tea_favorite.findUnique({
      where: { userId_teaId: { userId, teaId } },
      select: { id: true },
    });

    return Boolean(favorite);
  }

  private async isUserTeaFavorite(userId: number, userTeaId: number) {
    const favorite = await this.prisma.user_tea_favorite.findUnique({
      where: { userId_userTeaId: { userId, userTeaId } },
      select: { id: true },
    });

    return Boolean(favorite);
  }
}

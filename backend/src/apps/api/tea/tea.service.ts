import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateTeaDto } from './dto/create-tea.dto';
import { UpdateTeaDto } from './dto/update-tea.dto';

type TeaWriteInput = CreateTeaDto | UpdateTeaDto;

type NormalizedTeaInput = {
  name: string;
  description: string | null;
  image_url: string | null;
  categoryId: number;
  brew_temp: number;
};

@Injectable()
export class TeaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createTea(input: TeaWriteInput) {
    const data = this.normalizeTeaInput(input);
    await this.ensureCategoryExists(data.categoryId);

    const tea = await this.prisma.tea.create({
      data,
      include: { category: true },
    });

    await this.invalidateTeaCache(['tea:all', `tea:category:${tea.categoryId}`]);

    return tea;
  }

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
          style: true,
        },
      }),
    );
  }

  async updateTea(id: number, input: TeaWriteInput) {
    const existingTea = await this.prisma.tea.findUnique({
      where: { id },
      select: { id: true, categoryId: true },
    });

    if (!existingTea) {
      throw new NotFoundException(`Tea ${id} not found`);
    }

    const data = this.normalizeTeaInput(input);
    await this.ensureCategoryExists(data.categoryId);

    const updatedTea = await this.prisma.tea.update({
      where: { id },
      data,
      include: { category: true },
    });

    await this.invalidateTeaCache([
      'tea:all',
      `tea:${id}`,
      `tea:category:${existingTea.categoryId}`,
      `tea:category:${updatedTea.categoryId}`,
    ]);

    return updatedTea;
  }

  async deleteTea(id: number) {
    const existingTea = await this.prisma.tea.findUnique({
      where: { id },
      select: { id: true, categoryId: true },
    });

    if (!existingTea) {
      throw new NotFoundException(`Tea ${id} not found`);
    }

    await this.prisma.tea.delete({
      where: { id },
    });

    await this.invalidateTeaCache([
      'tea:all',
      `tea:${id}`,
      `tea:category:${existingTea.categoryId}`,
    ]);

    return { message: `Tea ${id} deleted` };
  }

  private normalizeTeaInput(input: TeaWriteInput): NormalizedTeaInput {
    const name = input.name.trim();
    const categoryId = input.categoryId;
    const brewTemp = input.brew_temp;

    return {
      name,
      description: this.parseOptionalStringOrNull(input.description),
      image_url: this.parseOptionalStringOrNull(input.image_url),
      categoryId,
      brew_temp: brewTemp,
    };
  }

  private parseOptionalStringOrNull(value?: string): string | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async ensureCategoryExists(categoryId: number): Promise<void> {
    const category = await this.prisma.tea_category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new BadRequestException(`categoryId ${categoryId} does not exist`);
    }
  }

  private async invalidateTeaCache(keys: string[]): Promise<void> {
    try {
      const client = this.redis.getClient();
      const uniqueKeys = [...new Set(keys)];

      if (uniqueKeys.length > 0) {
        await client.del(uniqueKeys);
      }
    } catch {
      // No-op when Redis is unavailable.
    }
  }
}

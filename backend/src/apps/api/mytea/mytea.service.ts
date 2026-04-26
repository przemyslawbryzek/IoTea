import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateMyTeaDto } from './dto/create-my-tea.dto';
import { CreateMyTeaInstructionDto } from './dto/create-my-tea-instruction.dto';
import { UpdateMyTeaDto } from './dto/update-my-tea.dto';
import { UpdateMyTeaInstructionDto } from './dto/update-my-tea-instruction.dto';

type MyTeaWriteInput = CreateMyTeaDto | UpdateMyTeaDto;
type MyTeaInstructionWriteInput =
  | CreateMyTeaInstructionDto
  | UpdateMyTeaInstructionDto;

type NormalizedMyTeaInput = {
  name: string;
  description: string | null;
  image_url: string | null;
  categoryId: number;
  brew_temp: number;
};

type NormalizedMyTeaInstructionInput = {
  styleId: number;
  grams_per_100ml: number;
  first_infusion_seconds: number;
  increment_seconds: number;
  max_infusions: number;
};

@Injectable()
export class MyTeaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createTea(userId: number, input: CreateMyTeaDto) {
    const data = this.normalizeTeaInput(input);
    await this.ensureCategoryExists(data.categoryId);

    return this.prisma.user_tea.create({
      data: {
        ...data,
        owner_id: userId,
      },
      include: { category: true },
    });
  }

  getMyTeas(userId: number) {
    return this.prisma.user_tea.findMany({
      where: { owner_id: userId },
      include: { category: true },
      orderBy: { created_at: 'desc' },
    });
  }

  getBrewingStyles() {
    return this.prisma.brewing_style.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getMyTeaById(userId: number, teaId: number) {
    const tea = await this.prisma.user_tea.findFirst({
      where: {
        id: teaId,
        owner_id: userId,
      },
      include: {
        category: true,
        instructions: {
          include: { style: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!tea) {
      throw new NotFoundException(`My tea ${teaId} not found`);
    }

    return tea;
  }

  async updateTea(userId: number, teaId: number, input: UpdateMyTeaDto) {
    const existingTea = await this.prisma.user_tea.findFirst({
      where: {
        id: teaId,
        owner_id: userId,
      },
      select: { id: true },
    });

    if (!existingTea) {
      throw new NotFoundException(`My tea ${teaId} not found`);
    }

    const data = this.normalizeTeaInput(input);
    await this.ensureCategoryExists(data.categoryId);

    return this.prisma.user_tea.update({
      where: { id: teaId },
      data,
      include: { category: true },
    });
  }

  async deleteTea(userId: number, teaId: number) {
    const existingTea = await this.prisma.user_tea.findFirst({
      where: {
        id: teaId,
        owner_id: userId,
      },
      select: { id: true },
    });

    if (!existingTea) {
      throw new NotFoundException(`My tea ${teaId} not found`);
    }

    const instructions = await this.prisma.brewing_instructions.findMany({
      where: { userTeaId: teaId },
      select: { id: true },
    });
    const instructionIds = instructions.map((instruction) => instruction.id);

    await this.prisma.$transaction(async (tx) => {
      if (instructionIds.length > 0) {
        await tx.brew.deleteMany({
          where: { instruction_id: { in: instructionIds } },
        });
      }

      await tx.brewing_instructions.deleteMany({
        where: { userTeaId: teaId },
      });

      await tx.user_tea.delete({
        where: { id: teaId },
      });
    });

    await Promise.all(
      instructionIds.map((instructionId) =>
        this.invalidateInstructionCache(instructionId),
      ),
    );

    return { message: `My tea ${teaId} deleted` };
  }

  async getMyTeaInstructions(userId: number, teaId: number) {
    await this.ensureMyTeaExists(userId, teaId);

    return this.prisma.brewing_instructions.findMany({
      where: { userTeaId: teaId },
      include: { style: true },
      orderBy: { id: 'asc' },
    });
  }

  async createMyTeaInstruction(
    userId: number,
    teaId: number,
    input: CreateMyTeaInstructionDto,
  ) {
    await this.ensureMyTeaExists(userId, teaId);
    await this.ensureStyleExists(input.styleId);

    const data = this.normalizeInstructionInput(input);

    return this.prisma.brewing_instructions.create({
      data: {
        ...data,
        userTeaId: teaId,
      },
      include: {
        style: true,
        userTea: {
          select: { brew_temp: true, owner_id: true },
        },
      },
    });
  }

  async getMyTeaInstruction(
    userId: number,
    teaId: number,
    instructionId: number,
  ) {
    await this.ensureMyTeaExists(userId, teaId);

    const instruction = await this.prisma.brewing_instructions.findFirst({
      where: {
        id: instructionId,
        userTeaId: teaId,
      },
      include: {
        style: true,
        userTea: {
          select: { brew_temp: true, owner_id: true },
        },
      },
    });

    if (!instruction) {
      throw new NotFoundException(
        `Instruction ${instructionId} for my tea ${teaId} not found`,
      );
    }

    return instruction;
  }

  async updateMyTeaInstruction(
    userId: number,
    teaId: number,
    instructionId: number,
    input: UpdateMyTeaInstructionDto,
  ) {
    await this.getMyTeaInstruction(userId, teaId, instructionId);
    await this.ensureStyleExists(input.styleId);

    const data = this.normalizeInstructionInput(input);

    const updated = await this.prisma.brewing_instructions.update({
      where: { id: instructionId },
      data: {
        ...data,
        userTeaId: teaId,
      },
      include: {
        style: true,
        userTea: {
          select: { brew_temp: true, owner_id: true },
        },
      },
    });

    await this.invalidateInstructionCache(instructionId);

    return updated;
  }

  async deleteMyTeaInstruction(
    userId: number,
    teaId: number,
    instructionId: number,
  ) {
    await this.getMyTeaInstruction(userId, teaId, instructionId);

    await this.prisma.$transaction(async (tx) => {
      await tx.brew.deleteMany({
        where: { instruction_id: instructionId },
      });

      await tx.brewing_instructions.delete({
        where: { id: instructionId },
      });
    });

    await this.invalidateInstructionCache(instructionId);

    return { message: `Instruction ${instructionId} deleted` };
  }

  private normalizeTeaInput(input: MyTeaWriteInput): NormalizedMyTeaInput {
    const name = input.name.trim();

    return {
      name,
      description: this.parseOptionalStringOrNull(input.description),
      image_url: this.parseOptionalStringOrNull(input.image_url),
      categoryId: input.categoryId,
      brew_temp: input.brew_temp,
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

  private async ensureStyleExists(styleId: number): Promise<void> {
    const style = await this.prisma.brewing_style.findUnique({
      where: { id: styleId },
      select: { id: true },
    });

    if (!style) {
      throw new BadRequestException(`styleId ${styleId} does not exist`);
    }
  }

  private async ensureMyTeaExists(userId: number, teaId: number) {
    const tea = await this.prisma.user_tea.findFirst({
      where: {
        id: teaId,
        owner_id: userId,
      },
      select: { id: true, brew_temp: true },
    });

    if (!tea) {
      throw new NotFoundException(`My tea ${teaId} not found`);
    }

    return tea;
  }

  private normalizeInstructionInput(
    input: MyTeaInstructionWriteInput,
  ): NormalizedMyTeaInstructionInput {
    return {
      styleId: input.styleId,
      grams_per_100ml: input.grams_per_100ml,
      first_infusion_seconds: input.first_infusion_seconds,
      increment_seconds: input.increment_seconds,
      max_infusions: input.max_infusions,
    };
  }

  private async invalidateInstructionCache(instructionId: number) {
    try {
      const client = this.redis.getClient();
      await client.del(`tea:instruction:${instructionId}`);
    } catch {
      // Ignore cache invalidation errors
    }
  }
}

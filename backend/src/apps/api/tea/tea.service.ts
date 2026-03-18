import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeaService {
  constructor(private readonly prisma: PrismaService) {}
  getTea() {
    return this.prisma.tea.findMany({
      include: {
        category: true,
      },
    });
  }
  getTeaById(id: number) {
    return this.prisma.tea.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
      },
    });
  }
  getCategory() {
    return this.prisma.tea_category.findMany();
  }
  getTeaByCategory(id: number) {
    return this.prisma.tea.findMany({
      where: {
        categoryId: id,
      },
      include: {
        category: true,
      },
    });
  }
}

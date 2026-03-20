const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run seed');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Dev seed: wipe demo tables and reset all auto-increment sequences.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "brewing_instructions", "Tea", "brewing_style", "tea_category" RESTART IDENTITY CASCADE',
  );

  const [greenCategory, oolongCategory] = await Promise.all([
    prisma.tea_category.create({ data: { name: 'Green' } }),
    prisma.tea_category.create({ data: { name: 'Oolong' } }),
  ]);

  const [gongfuStyle, westernStyle] = await Promise.all([
    prisma.brewing_style.create({
      data: {
        name: 'Gongfu',
        description: 'High leaf ratio and short steeps in many infusions.',
      },
    }),
    prisma.brewing_style.create({
      data: {
        name: 'Western',
        description: 'Lower leaf ratio and longer steeps.',
      },
    }),
  ]);

  const [longJing, tieGuanYin] = await Promise.all([
    prisma.tea.create({
      data: {
        name: 'Long Jing',
        description: 'Chestnut aroma, smooth and sweet.',
        image_url: null,
        categoryId: greenCategory.id,
        brew_temp: 80,
      },
    }),
    prisma.tea.create({
      data: {
        name: 'Tie Guan Yin',
        description: 'Floral aroma with creamy texture.',
        image_url: null,
        categoryId: oolongCategory.id,
        brew_temp: 95,
      },
    }),
  ]);

  await prisma.brewing_instructions.createMany({
    data: [
      {
        teaId: longJing.id,
        styleId: gongfuStyle.id,
        grams_per_100ml: '5.0',
        first_infusion_seconds: 15,
        increment_seconds: 5,
        max_infusions: 6,
      },
      {
        teaId: longJing.id,
        styleId: westernStyle.id,
        grams_per_100ml: '1.5',
        first_infusion_seconds: 120,
        increment_seconds: 30,
        max_infusions: 2,
      },
      {
        teaId: tieGuanYin.id,
        styleId: gongfuStyle.id,
        grams_per_100ml: '6.0',
        first_infusion_seconds: 12,
        increment_seconds: 4,
        max_infusions: 8,
      },
      {
        teaId: tieGuanYin.id,
        styleId: westernStyle.id,
        grams_per_100ml: '2.0',
        first_infusion_seconds: 150,
        increment_seconds: 25,
        max_infusions: 3,
      },
    ],
  });

  const teaCount = await prisma.tea.count();
  console.log(`Seed completed. Teas in database: ${teaCount}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

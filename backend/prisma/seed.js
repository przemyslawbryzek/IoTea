const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run seed');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Wipe demo tables and reset all auto-increment sequences
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "brewing_instructions", "Tea", "brewing_style", "tea_category" RESTART IDENTITY CASCADE',
  );

  // 1. Create categories
  const categories = await Promise.all([
    prisma.tea_category.create({ data: { name: 'White' } }),
    prisma.tea_category.create({ data: { name: 'Yellow' } }),
    prisma.tea_category.create({ data: { name: 'Raw Puerh' } }),
    prisma.tea_category.create({ data: { name: 'Green' } }),
    prisma.tea_category.create({ data: { name: 'Oolong' } }),
    prisma.tea_category.create({ data: { name: 'Ripened' } }),
    prisma.tea_category.create({ data: { name: 'Matcha' } }),
    prisma.tea_category.create({ data: { name: 'Black' } }),
    prisma.tea_category.create({ data: { name: 'Tisanes' } }),
  ]);

  const [whiteCategory, yellowCategory, rawPuerhCategory, greenCategory, oolongCategory, ripenedCategory, matchaCategory, blackCategory, tisanesCategory] = categories;

  // 2. Create brewing styles
  const [gongfuStyle, westernStyle] = await Promise.all([
    prisma.brewing_style.create({ data: { name: 'Gongfu', description: 'High leaf ratio and short steeps in many infusions.' } }),
    prisma.brewing_style.create({ data: { name: 'Western', description: 'Lower leaf ratio and longer steeps.' } }),
  ]);

  // 3. Define all teas
  const allTeas = [
    // --- WHITE TEAS ---
    { name: 'Heirloom Silver Needle', brew_temp: 95, categoryId: whiteCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 30, increment_seconds: 5, max_infusions: 7 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 180, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Silver Needle', brew_temp: 90, categoryId: whiteCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 45, increment_seconds: 10, max_infusions: 5 }, western: { grams_per_100ml: 0.7, first_infusion_seconds: 180, increment_seconds: 30, max_infusions: 3 } },
    { name: 'White Peony', brew_temp: 95, categoryId: whiteCategory.id, gongFu: { grams_per_100ml: 3.5, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 7 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Moonlight White', brew_temp: 99, categoryId: whiteCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 30, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.7, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Wild Slumber', brew_temp: 99, categoryId: whiteCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 12 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Simple Dreams 3', brew_temp: 99, categoryId: whiteCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 15 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Jade Star 9', brew_temp: 99, categoryId: whiteCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 15 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Lost Origin White', brew_temp: 95, categoryId: whiteCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 30, increment_seconds: 5, max_infusions: 7 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 180, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Purple Bud', brew_temp: 90, categoryId: whiteCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 30, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.7, first_infusion_seconds: 240, increment_seconds: 60, max_infusions: 2 } },

    // --- YELLOW TEAS ---
    { name: 'Wenzhou Gold', brew_temp: 80, categoryId: yellowCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 45, increment_seconds: 10, max_infusions: 5 }, western: { grams_per_100ml: 0.7, first_infusion_seconds: 240, increment_seconds: 60, max_infusions: 2 } },
    { name: 'Amber Mountain', brew_temp: 75, categoryId: yellowCategory.id, gongFu: { grams_per_100ml: 3.5, first_infusion_seconds: 60, increment_seconds: 10, max_infusions: 5 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 3 } },
    { name: 'Sovereign Bud', brew_temp: 80, categoryId: yellowCategory.id, gongFu: { grams_per_100ml: 3.5, first_infusion_seconds: 60, increment_seconds: 10, max_infusions: 5 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 240, increment_seconds: 60, max_infusions: 2 } },
    { name: 'Diamond Peak', brew_temp: 75, categoryId: yellowCategory.id, gongFu: { grams_per_100ml: 3.5, first_infusion_seconds: 120, increment_seconds: 15, max_infusions: 5 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 240, increment_seconds: 60, max_infusions: 2 } },

    // --- RAW PUERH ---
    { name: 'Legend Of The Limelight', brew_temp: 95, categoryId: rawPuerhCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 15 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Young Gushu 2025', brew_temp: 95, categoryId: rawPuerhCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 12 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: "90's Enigma Sheng", brew_temp: 99, categoryId: rawPuerhCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 15 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Glam Countess', brew_temp: 95, categoryId: rawPuerhCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 12 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Midnight Oracle', brew_temp: 95, categoryId: rawPuerhCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 12 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Bliss Beholder', brew_temp: 95, categoryId: rawPuerhCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 12 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Off The Apps', brew_temp: 99, categoryId: rawPuerhCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 10 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Sweet Treat Envoy', brew_temp: 95, categoryId: rawPuerhCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 12 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Juice Journo', brew_temp: 99, categoryId: rawPuerhCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 30, increment_seconds: 5, max_infusions: 12 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },

    // --- GREEN TEAS ---
    { name: 'Dragon Pearl Jasmine', brew_temp: 80, categoryId: greenCategory.id, gongFu: { grams_per_100ml: 6.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 5 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 180, increment_seconds: 60, max_infusions: 2 } },
    { name: 'Cloud Lake', brew_temp: 80, categoryId: greenCategory.id, gongFu: { grams_per_100ml: 3.5, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 7 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Kabuse Saeakari', brew_temp: 70, categoryId: greenCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 60, increment_seconds: 10, max_infusions: 4 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Monkey Picked', brew_temp: 85, categoryId: greenCategory.id, gongFu: { grams_per_100ml: 2.0, first_infusion_seconds: 90, increment_seconds: 20, max_infusions: 5 }, western: { grams_per_100ml: 0.3, first_infusion_seconds: 180, increment_seconds: 60, max_infusions: 2 } },
    { name: 'Tianshan Mist', brew_temp: 80, categoryId: greenCategory.id, gongFu: { grams_per_100ml: 3.5, first_infusion_seconds: 30, increment_seconds: 10, max_infusions: 6 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Jade Arrow - Pre Qing Ming', brew_temp: 85, categoryId: greenCategory.id, gongFu: { grams_per_100ml: 3.0, first_infusion_seconds: 30, increment_seconds: 5, max_infusions: 5 }, western: { grams_per_100ml: 0.5, first_infusion_seconds: 180, increment_seconds: 60, max_infusions: 2 } },
    { name: 'Fur Peak Supreme', brew_temp: 80, categoryId: greenCategory.id, gongFu: { grams_per_100ml: 3.0, first_infusion_seconds: 45, increment_seconds: 5, max_infusions: 5 }, western: { grams_per_100ml: 0.5, first_infusion_seconds: 180, increment_seconds: 60, max_infusions: 2 } },

    // --- OOLONG TEAS ---
    { name: 'Amber Gaba Oolong', brew_temp: 99, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 6.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 9 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Butterscotch Temple', brew_temp: 99, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 10, max_infusions: 9 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Yunnan Beauty', brew_temp: 95, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 9 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Tiger Eye Gaba', brew_temp: 99, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 6.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 10 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Duck Sh*t Oolong', brew_temp: 95, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 9 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Alishan Creams', brew_temp: 95, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 6.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 9 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Lotus Peak Rou Gui', brew_temp: 99, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 10 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Stone Milk', brew_temp: 99, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 30, increment_seconds: 5, max_infusions: 10 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Honey Duchess', brew_temp: 95, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Royal Peach Orchid', brew_temp: 95, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 9 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Superior Iron Goddess', brew_temp: 95, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 6.0, first_infusion_seconds: 15, increment_seconds: 10, max_infusions: 9 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Pear Cloud', brew_temp: 95, categoryId: oolongCategory.id, gongFu: { grams_per_100ml: 6.0, first_infusion_seconds: 30, increment_seconds: 5, max_infusions: 12 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },

    // --- RIPENED / DARK TEAS ---
    { name: 'Catching Candy Clouds', brew_temp: 99, categoryId: ripenedCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 15 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: '2003 Antique Nectar', brew_temp: 99, categoryId: ripenedCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 15 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Nug Potion', brew_temp: 99, categoryId: ripenedCategory.id, gongFu: { grams_per_100ml: 6.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 25 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 7 } },
    { name: 'Find Your Sunshine 3', brew_temp: 99, categoryId: ripenedCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 15 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Autumn Light', brew_temp: 99, categoryId: ripenedCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 10, increment_seconds: 5, max_infusions: 15 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Amulet Majesty', brew_temp: 99, categoryId: ripenedCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 15, increment_seconds: 5, max_infusions: 12 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },
    { name: 'Hunting For Pralines', brew_temp: 99, categoryId: ripenedCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 15 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Gateau Flapper', brew_temp: 99, categoryId: ripenedCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 15 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Bright Heart 2021', brew_temp: 99, categoryId: ripenedCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 12 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 5 } },

    // --- MATCHA ---
    { name: 'Genmai Matcha', brew_temp: 80, categoryId: matchaCategory.id, gongFu: { grams_per_100ml: 6.0, first_infusion_seconds: 15, increment_seconds: 10, max_infusions: 5 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },

    // --- BLACK TEAS ---
    { name: 'Souchong Liquor', brew_temp: 90, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 15, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.6, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 3 } },
    { name: 'Ruby Black', brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.5, first_infusion_seconds: 15, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 4 } },
    { name: 'Lemon Blossom Frost', brew_temp: 90, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 30, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 1.0, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 2 } },
    { name: 'Wildwood Gold', brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 7 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 2 } },
    { name: 'Little Tong Mu', brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.5, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 90, increment_seconds: 30, max_infusions: 3 } },
    { name: "Sultan's Quill", brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 10 }, western: { grams_per_100ml: 0.7, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Ancient Haze', brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 20, increment_seconds: 10, max_infusions: 7 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Midori Black', brew_temp: 90, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 7 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Fig Butter Black', brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Honeycomb Black', brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.7, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 2 } },
    { name: "Consort's Smile", brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.5, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Castleton Muscatel - Special Reserve Lot', brew_temp: 90, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 3.5, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 1.6, first_infusion_seconds: 300, increment_seconds: 100, max_infusions: 2 } },
    { name: 'Sweet Spice JJM', brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 25, increment_seconds: 5, max_infusions: 7 }, western: { grams_per_100ml: 0.7, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 3 } },
    { name: 'Wild Resin Lapsang', brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 5.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 3 } },
    { name: 'Golden Bud', brew_temp: 95, categoryId: blackCategory.id, gongFu: { grams_per_100ml: 4.0, first_infusion_seconds: 20, increment_seconds: 5, max_infusions: 8 }, western: { grams_per_100ml: 0.8, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 3 } },

    // --- TISANES (HERBAL) ---
    { name: 'Chamomile Flowers', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 1.5, first_infusion_seconds: 30, increment_seconds: 15, max_infusions: 5 }, western: { grams_per_100ml: 0.3, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 2 } },
    { name: 'Amachazuru Five Leaf', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 2.0, first_infusion_seconds: 30, increment_seconds: 15, max_infusions: 5 }, western: { grams_per_100ml: 0.3, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 2 } },
    { name: 'Butterfly Pea Flower', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 2.5, first_infusion_seconds: 30, increment_seconds: 20, max_infusions: 3 }, western: { grams_per_100ml: 0.4, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Purple Rose', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 3.0, first_infusion_seconds: 25, increment_seconds: 10, max_infusions: 5 }, western: { grams_per_100ml: 0.5, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Chrysanthemum Flowers', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 1.5, first_infusion_seconds: 15, increment_seconds: 5, max_infusions: 5 }, western: { grams_per_100ml: 0.3, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Rooibos', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 2.0, first_infusion_seconds: 30, increment_seconds: 15, max_infusions: 5 }, western: { grams_per_100ml: 0.3, first_infusion_seconds: 120, increment_seconds: 60, max_infusions: 2 } },
    { name: 'Lemon Verbena', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 1.5, first_infusion_seconds: 15, increment_seconds: 5, max_infusions: 5 }, western: { grams_per_100ml: 0.3, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Hibiscus Flowers', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 2.0, first_infusion_seconds: 15, increment_seconds: 5, max_infusions: 5 }, western: { grams_per_100ml: 0.3, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Peppermint Leaf', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 1.5, first_infusion_seconds: 15, increment_seconds: 5, max_infusions: 5 }, western: { grams_per_100ml: 0.3, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Dandelion Leaf', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 1.5, first_infusion_seconds: 15, increment_seconds: 5, max_infusions: 5 }, western: { grams_per_100ml: 0.3, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Ginkgo Leaf Tips', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 1.5, first_infusion_seconds: 15, increment_seconds: 5, max_infusions: 5 }, western: { grams_per_100ml: 0.3, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
    { name: 'Rose Buds', brew_temp: 99, categoryId: tisanesCategory.id, gongFu: { grams_per_100ml: 3.0, first_infusion_seconds: 15, increment_seconds: 5, max_infusions: 5 }, western: { grams_per_100ml: 0.5, first_infusion_seconds: 120, increment_seconds: 30, max_infusions: 2 } },
  ];

  // 4. Add all teas to database
  console.log(`Starting to add ${allTeas.length} teas...`);
  for (const tea of allTeas) {
    const createdTea = await prisma.tea.create({
      data: {
        name: tea.name,
        categoryId: tea.categoryId,
        brew_temp: tea.brew_temp,
      },
    });

    // Add brewing instructions
    await prisma.brewing_instructions.createMany({
      data: [
        {
          teaId: createdTea.id,
          styleId: gongfuStyle.id,
          grams_per_100ml: tea.gongFu.grams_per_100ml,
          first_infusion_seconds: tea.gongFu.first_infusion_seconds,
          increment_seconds: tea.gongFu.increment_seconds,
          max_infusions: tea.gongFu.max_infusions,
        },
        {
          teaId: createdTea.id,
          styleId: westernStyle.id,
          grams_per_100ml: tea.western.grams_per_100ml,
          first_infusion_seconds: tea.western.first_infusion_seconds,
          increment_seconds: tea.western.increment_seconds,
          max_infusions: tea.western.max_infusions,
        },
      ],
    });
  }

  const teaCount = await prisma.tea.count();
  console.log(`\n Seed completed. Teas in database: ${teaCount}`);
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

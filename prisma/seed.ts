import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

const DEV_USER_ID = "dev_user_mira";

const SYSTEM_CATEGORIES = [
  { key: "food",    name: "Alimentação",   icon: "cup",    color: "oklch(0.82 0.13 80)"  },
  { key: "market",  name: "Mercado",       icon: "cart",   color: "oklch(0.78 0.14 145)" },
  { key: "housing", name: "Moradia",       icon: "house",  color: "oklch(0.78 0.13 268)" },
  { key: "trans",   name: "Transporte",    icon: "car",    color: "oklch(0.74 0.16 24)"  },
  { key: "fun",     name: "Lazer",         icon: "film",   color: "oklch(0.78 0.16 320)" },
  { key: "health",  name: "Saúde",         icon: "heart",  color: "oklch(0.78 0.14 12)"  },
  { key: "edu",     name: "Educação",      icon: "book",   color: "oklch(0.78 0.13 210)" },
  { key: "pet",     name: "Pet",           icon: "pet",    color: "oklch(0.78 0.13 50)"  },
  { key: "sub",     name: "Assinaturas",   icon: "bolt",   color: "oklch(0.85 0.13 100)" },
  { key: "travel",  name: "Viagens",       icon: "globe",  color: "oklch(0.78 0.13 175)" },
  { key: "invest",  name: "Investimentos", icon: "invest", color: "oklch(0.78 0.13 268)" },
  { key: "income",  name: "Receita",       icon: "wallet", color: "oklch(0.82 0.16 148)" },
];

async function main() {
  // Dev user
  const user = await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    update: {},
    create: { id: DEV_USER_ID, email: "dev@mira.local", name: "Dev User" },
  });
  console.log(`✓ Dev user: ${user.id}`);

  // System categories (userId = null)
  for (const cat of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { key: cat.key, userId: null },
    });
    if (!existing) {
      await prisma.category.create({ data: { ...cat, isSystem: true } });
    } else {
      await prisma.category.update({
        where: { id: existing.id },
        data: { name: cat.name, icon: cat.icon, color: cat.color },
      });
    }
  }
  console.log(`✓ ${SYSTEM_CATEGORIES.length} system categories seeded.`);
  console.log(`\nAdd to your .env:\nDEV_USER_ID="${DEV_USER_ID}"`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

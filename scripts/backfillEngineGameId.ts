import { prisma } from "../lib/prisma";

async function main() {
  const games = await prisma.game.findMany({ select: { id: true, engineGameId: true } });

  let updated = 0;
  for (const g of games) {
    if (g.engineGameId) continue;

    await prisma.game.update({
      where: { id: g.id },
      data: { engineGameId: `legacy_${g.id}` },
    });
    updated++;
  }

  console.log(`Backfilled ${updated} games`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

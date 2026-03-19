import "dotenv/config";
import sampleData from "./sample-data";
import { prisma } from "../lib/prisma";

async function main() {
  try {
    // delete children first to avoid FK constraint errors (if you have relations)
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();

    await prisma.hotel.deleteMany();
    await prisma.restaurant.deleteMany();

    // ✅ NEW: seed tournament rules (safe defaults)
    // You can tune these later in the Admin → Rules page.
    const rules = [
      { youthLevel: "MITE", gameMinutes: 45, zamboniMinutes: 15, restAfterEndMinutes: 60 },
      { youthLevel: "SQUIRT", gameMinutes: 60, zamboniMinutes: 15, restAfterEndMinutes: 120 },
      { youthLevel: "PEEWEE", gameMinutes: 60, zamboniMinutes: 15, restAfterEndMinutes: 120 },
      { youthLevel: "BANTAM", gameMinutes: 60, zamboniMinutes: 15, restAfterEndMinutes: 120 },
    ];

    for (const r of rules) {
      await prisma.tournamentRule.upsert({
        where: { youthLevel: r.youthLevel },
        update: {
          gameMinutes: r.gameMinutes,
          zamboniMinutes: r.zamboniMinutes,
          restAfterEndMinutes: r.restAfterEndMinutes,
        },
        create: r,
      });
    }

    await prisma.hotel.createMany({ data: sampleData.hotels });
    await prisma.restaurant.createMany({ data: sampleData.restaurants });
    await prisma.user.createMany({ data: sampleData.users });

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
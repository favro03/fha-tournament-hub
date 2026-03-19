// app/api/brackets/[bracketId]/schedule/clear/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  stageTypes?: string[]; // optional: ["POOL_PLAY"] or ["PLACEMENT"]
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ bracketId: string }> }
) {
  const { bracketId: bracketIdParam } = await ctx.params;
  const bracketId = Number(bracketIdParam);

  if (!Number.isFinite(bracketId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid bracketId" },
      { status: 400 }
    );
  }

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body
  }

  const stageTypes =
    body.stageTypes && body.stageTypes.length > 0 ? body.stageTypes : null;

  const result = await prisma.$transaction(async (tx) => {
    // Find games we intend to clear
    const games = await tx.game.findMany({
      where: {
        bracketId,
        ...(stageTypes ? { stageType: { in: stageTypes } } : {}),
      },
      select: { id: true, timesId: true },
    });

    const timesIds = games
      .map((g) => g.timesId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));

    // Unschedule games (keep FINAL results intact)
    // Clear anything that has a timesId OR is currently scheduled.
    const gamesCleared = await tx.game.updateMany({
      where: {
        bracketId,
        ...(stageTypes ? { stageType: { in: stageTypes } } : {}),
        OR: [{ timesId: { not: null } }, { status: "SCHEDULED" }],
      },
      data: {
        timesId: null,
        day: "",
        date: "",
        time: "",
        location: "",
        status: "UNSCHEDULED",
      },
    });

    // Delete only the Times rows that were actually assigned to cleared games
    const slotsDeleted = timesIds.length
      ? await tx.times.deleteMany({
          where: { id: { in: timesIds } },
        })
      : { count: 0 };

    return { gamesCleared: gamesCleared.count, slotsDeleted: slotsDeleted.count };
  });

  return NextResponse.json({
    ok: true,
    bracketId,
    stageTypes: stageTypes ?? "ALL",
    ...result,
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ParticipantRef } from "@/lib/tournament-engine/types";

type Body = {
  poolId?: string;
  clearExisting?: boolean;
};

function poolRank(poolId: string, rank: number): ParticipantRef {
  return { type: "POOL_RANK", poolId, rank };
}

export async function POST(req: Request, ctx: { params: Promise<{ bracketId: string }> }) {
  try {
    const { bracketId: bracketIdParam } = await ctx.params;
    const bracketId = Number(bracketIdParam);

    if (!Number.isFinite(bracketId)) {
      return NextResponse.json({ ok: false, error: "Invalid bracketId" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const poolId = (body.poolId ?? "pool-A").trim();
    const clearExisting = body.clearExisting === true;

    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      select: { id: true },
    });

    if (!bracket) {
      return NextResponse.json({ ok: false, error: "Bracket not found" }, { status: 404 });
    }

    const existing = await prisma.game.findMany({
      where: { bracketId, stageType: "PLACEMENT", stageId: poolId },
      select: { engineGameId: true },
      orderBy: { engineGameId: "asc" },
    });

    if (existing.length > 0 && !clearExisting) {
      return NextResponse.json({
        ok: true,
        bracketId,
        poolId,
        alreadyExists: true,
        existingCount: existing.length,
        existingEngineGameIds: existing.map((g) => g.engineGameId),
        createdCount: 0,
      });
    }

    const gamesToCreate = [
      {
        engineGameId: `place:${poolId}:1v4`,
        stageType: "PLACEMENT",
        stageId: poolId,
        round: 1,
        status: "UNSCHEDULED",
        homeRef: poolRank(poolId, 1) as any,
        awayRef: poolRank(poolId, 4) as any,
        homeTeam: "Seed 1",
        awayTeam: "Seed 4",
        result: null as any,
        timesId: null as any,
        day: "",
        date: "",
        time: "",
        location: "",
      },
      {
        engineGameId: `place:${poolId}:2v3`,
        stageType: "PLACEMENT",
        stageId: poolId,
        round: 1,
        status: "UNSCHEDULED",
        homeRef: poolRank(poolId, 2) as any,
        awayRef: poolRank(poolId, 3) as any,
        homeTeam: "Seed 2",
        awayTeam: "Seed 3",
        result: null as any,
        timesId: null as any,
        day: "",
        date: "",
        time: "",
        location: "",
      },
    ];

    await prisma.$transaction(async (tx) => {
      if (existing.length > 0 && clearExisting) {
        await tx.game.deleteMany({
          where: { bracketId, stageType: "PLACEMENT", stageId: poolId },
        });
      }

      for (const g of gamesToCreate) {
        await tx.game.create({
          data: {
            bracketId,
            engineGameId: g.engineGameId,
            stageType: g.stageType as any,
            stageId: g.stageId,
            round: g.round,
            status: g.status as any,
            homeRef: g.homeRef as any,
            awayRef: g.awayRef as any,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
            result: g.result as any,
            timesId: g.timesId as any,
            day: g.day,
            date: g.date,
            time: g.time,
            location: g.location,
          } as any,
        });
      }
    });

    return NextResponse.json({
      ok: true,
      bracketId,
      poolId,
      createdCount: gamesToCreate.length,
      createdEngineGameIds: gamesToCreate.map((g) => g.engineGameId),
      clearedExisting: clearExisting && existing.length > 0,
      previousExistingCount: existing.length,
    });
  } catch (err: any) {
    console.error("GENERATE PLACEMENT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
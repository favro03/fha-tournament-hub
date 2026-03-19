import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ bracketId: string }> }
) {
  try {
    const { bracketId: bracketIdParam } = await ctx.params;
    const bracketId = Number(bracketIdParam);

    if (!Number.isFinite(bracketId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid bracketId" },
        { status: 400 }
      );
    }

    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      select: { id: true, youthLevel: true },
    });

    if (!bracket) {
      return NextResponse.json(
        { ok: false, error: "Bracket not found" },
        { status: 404 }
      );
    }

    const rule = await prisma.tournamentRule.findUnique({
      where: { youthLevel: bracket.youthLevel },
      select: {
        youthLevel: true,
        gameMinutes: true,
        zamboniMinutes: true,
        restAfterEndMinutes: true,
      },
    });

    if (!rule) {
      return NextResponse.json(
        { ok: false, error: `No TournamentRule for ${bracket.youthLevel}` },
        { status: 404 }
      );
    }

    const intervalMinutes = rule.gameMinutes + rule.zamboniMinutes;

    return NextResponse.json({
      ok: true,
      youthLevel: rule.youthLevel,
      gameMinutes: rule.gameMinutes,
      zamboniMinutes: rule.zamboniMinutes,
      restAfterEndMinutes: rule.restAfterEndMinutes,
      intervalMinutes,
    });
  } catch (err: any) {
    console.error("GET BRACKET RULES ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
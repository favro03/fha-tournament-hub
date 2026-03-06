// app/api/game-by-id/[gameId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await ctx.params;
  const id = Number(gameId);

  const body = await req.json().catch(() => null);
  const bracketId = Number(body?.bracketId);
  const patch = body?.patch ?? {};

  if (!Number.isFinite(id) || !Number.isFinite(bracketId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid gameId or bracketId" },
      { status: 400 }
    );
  }

  // Allow only these fields for Phase 1
  const allowed: any = {};
  for (const k of [
    "time",
    "location",
    "homeScore",
    "awayScore",
    "homePenalty",
    "awayPenalty",
    "status",
  ]) {
    if (k in patch) allowed[k] = patch[k];
  }

  const updated = await prisma.game.update({
    where: { id },
    data: allowed,
  });

  if (updated.bracketId !== bracketId) {
    return NextResponse.json(
      { ok: false, error: "Bracket mismatch" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, game: updated });
}
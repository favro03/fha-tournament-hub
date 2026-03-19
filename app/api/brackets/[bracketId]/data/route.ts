import { NextResponse } from "next/server";
import { bracketsManager } from "@/lib/brackets-manager";

// GET /api/brackets/:bracketId/data
export async function GET(
  request: Request,
  ctx: { params: Promise<{ bracketId: string }> }
) {
  const { bracketId: bracketIdParam } = await ctx.params;
  const bracketId = Number(bracketIdParam);

  if (!Number.isFinite(bracketId)) {
    return NextResponse.json({ error: "Invalid bracket id" }, { status: 400 });
  }

  try {
    const data = await bracketsManager.get.tournamentData(bracketId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
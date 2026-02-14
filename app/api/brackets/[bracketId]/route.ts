// app/api/brackets/[bracketId]/route.ts
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
      select: {
        id: true,
        name: true,
        youthLevel: true,
        standingsRules: true,
        createdAt: true,
        updatedAt: true,
        games: {
          orderBy: [{ stageType: "asc" }, { stageId: "asc" }, { engineGameId: "asc" }],
          select: {
            engineGameId: true,
            stageType: true,
            stageId: true,
            round: true,
            status: true,
            homeTeam: true,
            awayTeam: true,
            homeRef: true,
            awayRef: true,
            result: true,

            // Optional legacy fields (only if they exist in your schema)
            // Prisma will ignore these unless present - but since select
            // must match schema exactly, we CANNOT include unknown fields.
            //
            // If you want additional fields later, we can add them once we
            // confirm the schema.
          },
        },
      },
    });

    if (!bracket) {
      return NextResponse.json(
        { ok: false, error: "Bracket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, bracket });
  } catch (err: any) {
    console.error("GET BRACKET ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

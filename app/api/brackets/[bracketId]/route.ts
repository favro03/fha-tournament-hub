import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
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

    const body = await req.json();
    const { name, youthLevel, side, date, image, tournamentFormat } = body as {
      name?: string;
      youthLevel?: string;
      side?: "HOME" | "AWAY";
      date?: string;
      image?: string;
      tournamentFormat?: string;
    };

    if (!name || !youthLevel || !date || !side) {
      return NextResponse.json(
        { ok: false, error: "name, youthLevel, side, and date are required" },
        { status: 400 }
      );
    }

    if (side !== "HOME" && side !== "AWAY") {
      return NextResponse.json(
        { ok: false, error: "side must be HOME or AWAY" },
        { status: 400 }
      );
    }

    const updated = await prisma.bracket.update({
      where: { id: bracketId },
      data: {
        name,
        youthLevel,
        side,
        date,
        image: image ?? "",
        tournamentFormat: tournamentFormat ?? undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, bracketId: updated.id });
  } catch (err: any) {
    console.error("UPDATE BRACKET ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
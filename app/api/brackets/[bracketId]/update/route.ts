import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { bracketId: string } }
) {
  const bracketId = Number(params.bracketId);
  if (!Number.isFinite(bracketId)) {
    return NextResponse.json({ ok: false, error: "Invalid bracketId" }, { status: 400 });
  }

  const body = await req.json();
  const { name, youthLevel, date, image, tournamentFormat } = body as {
    name?: string;
    youthLevel?: string;
    date?: string;
    image?: string;
    tournamentFormat?: string;
  };

  if (!name || !youthLevel || !date) {
    return NextResponse.json(
      { ok: false, error: "name, youthLevel, and date are required" },
      { status: 400 }
    );
  }

  const updated = await prisma.bracket.update({
    where: { id: bracketId },
    data: {
      name,
      youthLevel,
      date,
      image: image ?? "",
      tournamentFormat: tournamentFormat ?? undefined,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, bracketId: updated.id });
}

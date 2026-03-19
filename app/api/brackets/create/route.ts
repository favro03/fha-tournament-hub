import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const { name, youthLevel, side, date, image } = body as {
    name: string;
    youthLevel: string;
    side: "HOME" | "AWAY";
    date: string;
    image: string;
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

  if (!image || typeof image !== "string" || image.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "image is required for upload-only brackets" },
      { status: 400 }
    );
  }

  const bracket = await prisma.bracket.create({
    data: {
      name,
      youthLevel,
      side,
      date,
      image,
      bracketName: "",
      tournamentFormat: "IMAGE_UPLOAD",
      format: "IMAGE_UPLOAD",
      engineConfig: null as any,
      standingsRules: null as any,
    },
  });

  return NextResponse.json({ ok: true, bracketId: bracket.id });
}
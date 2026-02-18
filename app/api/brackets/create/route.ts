import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const { name, youthLevel, date, image } = body as {
    name: string;
    youthLevel: string;
    date: string;
    image: string;
  };

  if (!name || !youthLevel || !date) {
    return NextResponse.json(
      { ok: false, error: "name, youthLevel, and date are required" },
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
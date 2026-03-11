import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ bracketId: string }> }
) {
  try {
    const { bracketId } = await context.params;
    const id = Number(bracketId);

    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid bracket id' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const incomingTeams = Array.isArray(body?.teams) ? body.teams : [];

    const existingTeams = await prisma.team.findMany({
      where: { bracketId: id },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        teamName: true,
      },
    });

    for (const team of existingTeams) {
      const incoming = incomingTeams.find(
        (t: { id?: number; teamName?: string }) => Number(t?.id) === team.id
      );

      if (!incoming) continue;

      const nextName = String(incoming.teamName ?? '').trim();
      const oldName = String(team.teamName ?? '').trim();

      if (!nextName) {
        return NextResponse.json(
          { ok: false, error: 'Team names cannot be blank' },
          { status: 400 }
        );
      }

      if (nextName === oldName) continue;

      await prisma.team.update({
        where: { id: team.id },
        data: { teamName: nextName },
      });

      await prisma.game.updateMany({
        where: {
          bracketId: id,
          homeTeam: oldName,
        },
        data: {
          homeTeam: nextName,
        },
      });

      await prisma.game.updateMany({
        where: {
          bracketId: id,
          awayTeam: oldName,
        },
        data: {
          awayTeam: nextName,
        },
      });
    }

    const updatedTeams = await prisma.team.findMany({
      where: { bracketId: id },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        teamName: true,
      },
    });

    return NextResponse.json({
      ok: true,
      teams: updatedTeams,
    });
  } catch (error) {
    console.error('PATCH /api/brackets/[bracketId]/teams failed', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update team names' },
      { status: 500 }
    );
  }
}
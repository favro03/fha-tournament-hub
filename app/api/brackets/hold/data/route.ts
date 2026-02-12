import { NextResponse } from 'next/server';
import { bracketsManager } from '@/lib/brackets-manager';

// GET /api/brackets/:id/data
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid bracket id' }, { status: 400 });
  }
  try {
    // bracketsManager.get.tournamentData returns all data needed for brackets-viewer
    const data = await bracketsManager.get.tournamentData(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

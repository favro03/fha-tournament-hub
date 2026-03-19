import { NextResponse } from 'next/server';
import { bracketsManager } from '@/lib/brackets-manager';
//was an error moved to brackets-manager, but this is the route that calls it, so it should be fine here
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

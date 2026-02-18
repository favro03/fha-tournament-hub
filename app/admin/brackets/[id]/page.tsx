// app/admin/brackets/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import BracketFormClient from "./bracket-form-client";

export default async function AdminBracketEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bracketId = parseInt(id, 10);

  if (!Number.isFinite(bracketId)) {
    return (
      <div className="p-6">
        Invalid bracket id. params.id = <code>{String(id)}</code>
      </div>
    );
  }

  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: {
      id: true,
      name: true,
      youthLevel: true,
      date: true,
      image: true,
      tournamentFormat: true,
      format: true,
      engineConfig: true,
    },
  });

  if (!bracket) return <div className="p-6">Bracket not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="h2-bold">Update Bracket</h2>

        <Link
          href={`/admin/brackets/${bracketId}/schedule`}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
        >
          Schedule
        </Link>
      </div>

      <BracketFormClient initial={bracket} mode="update" />
    </div>
  );
}

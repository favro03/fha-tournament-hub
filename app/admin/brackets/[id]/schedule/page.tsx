import { getBracketById } from "@/lib/actions/brackets.actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SchedulingClient from "./scheduling-client";

export const metadata = {
  title: "Schedule Bracket",
};

export default async function AdminBracketSchedulePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const bracket = await getBracketById(id);
  if (!bracket) return notFound();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="h2-bold">Schedule: {bracket.name}</h1>
          <p className="text-sm text-muted-foreground">
            Bracket #{bracket.id} • {bracket.youthLevel} • {bracket.format}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/brackets/${bracket.id}`}>Back to Bracket</Link>
        </Button>
      </div>

      <SchedulingClient bracketId={Number(bracket.id)} />
    </div>
  );
}

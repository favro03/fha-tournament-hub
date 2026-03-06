// app/brackets/page.tsx
import Link from "next/link";
import { getPublicBracketsList } from "@/lib/queries/publicBracketsList";

function pill(active: boolean) {
  return active
    ? "rounded-full border bg-slate-900 px-3 py-1 text-sm text-white"
    : "rounded-full border bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50";
}

export default async function PublicBracketsPage(props: {
  searchParams?: Promise<{ side?: string; level?: string }>;
}) {
  const sp = (await props.searchParams) ?? {};

  const side = sp.side === "AWAY" ? "AWAY" : "HOME";
  const level = sp.level ? String(sp.level) : null;

  const { items, levels } = await getPublicBracketsList({ side, level });

  const qs = (params: Record<string, string | null | undefined>) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brackets</h1>
          <p className="text-sm text-slate-600">
            {side === "HOME" ? "Home tournaments" : "Away tournaments"} • Public view
          </p>
        </div>

        {/* Home/Away toggle */}
        <div className="flex gap-2">
          <Link
            href={`/brackets${qs({ side: "HOME", level })}`}
            className={pill(side === "HOME")}
          >
            Home
          </Link>
          <Link
            href={`/brackets${qs({ side: "AWAY", level })}`}
            className={pill(side === "AWAY")}
          >
            Away
          </Link>
        </div>
      </div>

      {/* Level filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={`/brackets${qs({ side, level: null })}`} className={pill(!level)}>
          All Levels
        </Link>

        {levels.map((lvl) => (
          <Link
            key={lvl}
            href={`/brackets${qs({ side, level: lvl })}`}
            className={pill(level === lvl)}
          >
            {lvl}
          </Link>
        ))}
      </div>

      {/* Bracket cards */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
            No brackets found.
          </div>
        ) : (
          items.map((b) => (
            <Link
              key={b.id}
              href={`/brackets/${b.id}`}
              className="block rounded-lg border bg-white p-4 shadow-sm hover:bg-slate-50"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-slate-900">
                    {b.name}
                  </div>

                  <div className="text-sm text-slate-600">
                    {b.youthLevel} • {b.date}
                    {b.image?.trim() ? " • Image" : ""}
                  </div>
                </div>

                <div className="text-sm text-slate-700">View →</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
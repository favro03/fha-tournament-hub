import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";
import { getPublicBracketsList } from "@/lib/queries/publicBracketsList";

function pill(active: boolean) {
  return active
    ? "rounded-full border border-emerald-400/35 bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-white shadow-sm"
    : "rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 hover:border-emerald-400/25 hover:bg-emerald-500/10 hover:text-white";
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
    <div className="min-h-screen bg-[url('/images/rinkWlights.png')] bg-cover bg-center bg-fixed">
      <div className="min-h-screen bg-[linear-gradient(180deg,rgba(3,18,12,0.58)_0%,rgba(6,28,18,0.72)_38%,rgba(2,10,8,0.88)_100%)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
          <div className="rounded-[32px] border border-emerald-400/20 bg-[#264331]/30 p-5 shadow-2xl backdrop-blur-sm lg:p-8">
            <div className="mb-8 flex flex-col gap-4 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/20">
                  <Trophy className="h-7 w-7" />
                </div>

            

                <h1 className="mt-2 text-3xl font-bold text-white lg:text-5xl">
                  Brackets
                </h1>

                <p className="mt-3 text-sm text-slate-200 lg:text-base">
                  {side === "HOME" ? "Home tournaments" : "Away tournaments"} 
                </p>
              </div>

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

            <div className="mb-6 flex flex-wrap gap-2">
              <Link
                href={`/brackets${qs({ side, level: null })}`}
                className={pill(!level)}
              >
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

            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="rounded-[28px] border border-emerald-400/15 bg-slate-950/70 p-8 text-center text-sm text-slate-300 shadow-xl backdrop-blur-md">
                  No brackets found.
                </div>
              ) : (
                items.map((b) => (
                  <Link
                    key={b.id}
                    href={`/brackets/${b.id}`}
                    className="group block rounded-[28px] border border-emerald-400/15 bg-slate-950/70 p-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/35 hover:bg-slate-900/85"
                  >
                    <div className="absolute inset-0 pointer-events-none rounded-[28px] bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_40%)]" />

                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-white lg:text-xl">
                          {b.name}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                          <span>{b.youthLevel}</span>
                          <span className="text-emerald-300/70">•</span>
                          <span>{b.date}</span>
                          
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition group-hover:text-white">
                        View Bracket
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
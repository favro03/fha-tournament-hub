import { formatTiebreakerName } from "@/lib/bracket-labels";
import type { BracketStandingsView } from "@/lib/queries/bracketStandings";

export default function StandingsTable({
  standings,
  title = "Standings",
}: {
  standings: BracketStandingsView | null;
  title?: string;
}) {
  if (!standings || standings.pools.length === 0) {
    return (
      <div className="rounded-[28px] border border-emerald-400/15 bg-slate-950/75 p-5 text-white shadow-xl backdrop-blur-md">
        <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-3 text-sm text-slate-300">No pool standings available yet.</p>
      </div>
    );
  }

  const tiebreakOrder = standings.tiebreakers
    .map(formatTiebreakerName)
    .join(" • ");

  return (
    <div className="rounded-[28px] border border-emerald-400/15 bg-slate-950/75 p-5 text-white shadow-xl backdrop-blur-md">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-2 text-sm text-slate-300">
            3 Pts for a shut out win | 2 Pts for a Win | 1 Pt for a Tie
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Tie-break order:{" "}
            {tiebreakOrder ||
              "Head-to-Head • Goals Allowed • Goals For • Penalty Minutes"}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {standings.pools.map((pool) => (
          <div key={pool.poolId} className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              {pool.poolName}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-emerald-400/12 bg-white/5">
              <table className="min-w-[880px] w-full text-sm text-slate-200">
                <thead className="bg-emerald-500/10 text-left text-slate-100">
                  <tr className="border-b border-emerald-400/12">
                    <th className="p-3 font-semibold">Seed</th>
                    <th className="p-3 font-semibold">Team</th>
                    <th className="p-3 font-semibold">PTS</th>
                    <th className="p-3 font-semibold">GP</th>
                    <th className="p-3 font-semibold">W</th>
                    <th className="p-3 font-semibold">L</th>
                    <th className="p-3 font-semibold">T</th>
                    <th className="p-3 font-semibold">GA</th>
                    <th className="p-3 font-semibold">GF</th>
                    <th className="p-3 font-semibold">PIM</th>
                  </tr>
                </thead>
                <tbody>
                  {pool.rows.map((row, index) => (
                    <tr
                      key={`${pool.poolId}-${row.teamId}`}
                      className={`border-b border-emerald-400/10 last:border-b-0 ${
                        index % 2 === 0 ? "bg-white/[0.03]" : "bg-transparent"
                      }`}
                    >
                      <td className="p-3 font-semibold text-white">{row.seed}</td>
                      <td className="p-3 font-medium text-white">{row.teamName}</td>
                      <td className="p-3 font-semibold text-emerald-300">{row.pts}</td>
                      <td className="p-3">{row.gp}</td>
                      <td className="p-3">{row.w}</td>
                      <td className="p-3">{row.l}</td>
                      <td className="p-3">{row.t}</td>
                      <td className="p-3">{row.ga}</td>
                      <td className="p-3">{row.gf}</td>
                      <td className="p-3">{row.pim}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
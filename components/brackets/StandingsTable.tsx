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
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-3 text-sm text-slate-600">No pool standings available yet.</p>
      </div>
    );
  }

  const tiebreakOrder = standings.tiebreakers.map(formatTiebreakerName).join(" • ");

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tie-break order: {tiebreakOrder || "Head-to-Head • Goals Allowed • Goals For • Penalty Minutes"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {standings.pools.map((pool) => (
          <div key={pool.poolId} className="space-y-3">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              {pool.poolName}
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-[880px] w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr className="border-b">
                    <th className="p-2">Seed</th>
                    <th className="p-2">Team</th>
                    <th className="p-2">GP</th>
                    <th className="p-2">W</th>
                    <th className="p-2">L</th>
                    <th className="p-2">T</th>
                    <th className="p-2">PTS</th>
                    <th className="p-2">GA</th>
                    <th className="p-2">GF</th>
                    <th className="p-2">PIM</th>
                  </tr>
                </thead>
                <tbody>
                  {pool.rows.map((row) => (
                    <tr key={`${pool.poolId}-${row.teamId}`} className="border-b last:border-b-0">
                      <td className="p-2 font-semibold text-slate-900">{row.seed}</td>
                      <td className="p-2 font-medium text-slate-900">{row.teamName}</td>
                      <td className="p-2">{row.gp}</td>
                      <td className="p-2">{row.w}</td>
                      <td className="p-2">{row.l}</td>
                      <td className="p-2">{row.t}</td>
                      <td className="p-2 font-semibold">{row.pts}</td>
                      <td className="p-2">{row.ga}</td>
                      <td className="p-2">{row.gf}</td>
                      <td className="p-2">{row.pim}</td>
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

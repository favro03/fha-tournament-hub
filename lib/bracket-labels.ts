import type { Tiebreaker } from "@/lib/tournament-engine/types";

export function getPlacementLabel(args: {
  stageType?: string | null;
  engineGameId?: string | null;
  label?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
}) {
  const stageType = String(args.stageType ?? "").trim();
  const existingLabel = String(args.label ?? "").trim();
  const engineGameId = String(args.engineGameId ?? "").trim();

  if (stageType !== "PLACEMENT") return existingLabel || "";

  const normalizedExisting = existingLabel.toLowerCase();
  if (
    normalizedExisting &&
    normalizedExisting !== "placement" &&
    normalizedExisting !== "5th place"
  ) {
    return existingLabel;
  }

  const matchup = parsePlacementMatchup(engineGameId);
  if (!matchup) return existingLabel || "Placement";

  const [seedA, seedB] = matchup;
  const normalized = `${Math.min(seedA, seedB)}v${Math.max(seedA, seedB)}`;

  if (normalized === "1v2") return "Championship";
  if (normalized === "3v4") return "3rd Place";
  if (normalized === "5v6") return "Consolation";

  return `Seed ${seedA} vs Seed ${seedB}`;
}

export function parsePlacementMatchup(engineGameId: string): [number, number] | null {
  const raw = String(engineGameId ?? "").trim();
  if (!raw) return null;

  const match = raw.match(/(?:place_|:)(\d+)v(\d+)/i);
  if (!match) return null;

  const seedA = Number(match[1]);
  const seedB = Number(match[2]);

  if (!Number.isFinite(seedA) || !Number.isFinite(seedB)) return null;
  return [seedA, seedB];
}

export function formatTiebreakerName(tb: Tiebreaker | string) {
  switch (tb) {
    case "HEAD_TO_HEAD":
      return "Head-to-Head";
    case "GOALS_ALLOWED":
      return "Goals Allowed";
    case "GOALS_FOR":
      return "Goals For";
    case "GOAL_DIFF":
      return "Goal Differential";
    case "PENALTY_MINUTES":
      return "Penalty Minutes";
    case "COIN_FLIP":
      return "Coin Flip";
    default:
      return String(tb ?? "").replace(/_/g, " ");
  }
}

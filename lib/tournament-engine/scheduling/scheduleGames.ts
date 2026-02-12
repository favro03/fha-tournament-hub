import type { ParticipantRef } from "../types";

export type TimeSlotInput = {
  id: string; // DB Times.id as string (we'll convert later) OR a client id
  start: string; // ISO datetime string
  location: string;
};

export type SchedulableGame = {
  engineGameId: string;
  stageType: string;
  homeRef: ParticipantRef | null;
  awayRef: ParticipantRef | null;
};

export type ScheduledAssignment = {
  engineGameId: string;
  slotId: string;
};

function isTeamRef(ref: ParticipantRef | null): ref is { type: "TEAM"; teamId: string } {
  return !!ref && ref.type === "TEAM" && typeof (ref as any).teamId === "string";
}

/**
 * Rest rule:
 * - "MITE" => 60 minutes
 * - everything else => 120 minutes
 */
export function getMinRestMinutes(youthLevel: string) {
  const lvl = (youthLevel ?? "").toUpperCase();
  return lvl === "MITE" || lvl === "MITES" ? 60 : 120;
}

/**
 * MVP greedy scheduler:
 * - Only schedules games where BOTH sides are TEAM refs.
 * - Assigns earliest available slot that doesn't violate minRestMinutes for either team.
 * - Tracks ALL scheduled start times per team (so multi-rink & future tweaks are safe).
 */
export function scheduleGamesGreedy(args: {
  games: SchedulableGame[];
  slots: TimeSlotInput[];
  minRestMinutes: number;
}): {
  assignments: ScheduledAssignment[];
  unscheduled: string[]; // engineGameId list
} {
  const { games, slots, minRestMinutes } = args;

  const sortedSlots = [...slots].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  // Schedule POOL_PLAY first, then PLACEMENT, then everything else
  const sortedGames = [...games].sort((a, b) => {
    const pri = (g: SchedulableGame) =>
      g.stageType === "POOL_PLAY" ? 0 : g.stageType === "PLACEMENT" ? 1 : 2;
    const d = pri(a) - pri(b);
    if (d !== 0) return d;
    return a.engineGameId.localeCompare(b.engineGameId);
  });

  // teamId -> list of scheduled start millis
  const startsByTeam = new Map<string, number[]>();
  const usedSlotIds = new Set<string>();

  const assignments: ScheduledAssignment[] = [];
  const unscheduled: string[] = [];

  const minRestMs = minRestMinutes * 60 * 1000;

  const canTeamPlayAt = (teamId: string, slotStart: number) => {
    const starts = startsByTeam.get(teamId);
    if (!starts || starts.length === 0) return true;

    // Must be >= minRest away from EVERY already scheduled start
    for (const prev of starts) {
      if (Math.abs(slotStart - prev) < minRestMs) return false;
    }
    return true;
  };

  const addTeamStart = (teamId: string, slotStart: number) => {
    const arr = startsByTeam.get(teamId) ?? [];
    arr.push(slotStart);
    startsByTeam.set(teamId, arr);
  };

  for (const g of sortedGames) {
    // Only schedule if home/away are TEAM refs
    if (!isTeamRef(g.homeRef) || !isTeamRef(g.awayRef)) {
      unscheduled.push(g.engineGameId);
      continue;
    }

    const homeId = g.homeRef.teamId;
    const awayId = g.awayRef.teamId;

    let placed = false;

    for (const slot of sortedSlots) {
      if (usedSlotIds.has(slot.id)) continue;

      const slotStart = new Date(slot.start).getTime();
      if (!Number.isFinite(slotStart)) continue;

      // Prevent same-team double-booking across rinks/time
      const homeOk = canTeamPlayAt(homeId, slotStart);
      const awayOk = canTeamPlayAt(awayId, slotStart);

      if (homeOk && awayOk) {
        assignments.push({ engineGameId: g.engineGameId, slotId: slot.id });
        usedSlotIds.add(slot.id);

        addTeamStart(homeId, slotStart);
        addTeamStart(awayId, slotStart);

        placed = true;
        break;
      }
    }

    if (!placed) {
      unscheduled.push(g.engineGameId);
    }
  }

  return { assignments, unscheduled };
}

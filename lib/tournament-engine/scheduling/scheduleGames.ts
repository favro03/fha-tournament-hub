import type { ParticipantRef } from "../types";

export type TimeSlotInput = {
  id: string;
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

function isTeamRef(
  ref: ParticipantRef | null
): ref is { type: "TEAM"; teamId: string } {
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

function stagePriority(stageType: string) {
  return stageType === "POOL_PLAY" ? 0 : stageType === "PLACEMENT" ? 1 : 2;
}

/**
 * MVP greedy scheduler (kept for reference / fallback)
 */
export function scheduleGamesGreedy(args: {
  games: SchedulableGame[];
  slots: TimeSlotInput[];
  minRestMinutes: number;
}): {
  assignments: ScheduledAssignment[];
  unscheduled: string[];
} {
  const { games, slots, minRestMinutes } = args;

  const sortedSlots = [...slots].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const sortedGames = [...games].sort((a, b) => {
    const d = stagePriority(a.stageType) - stagePriority(b.stageType);
    if (d !== 0) return d;
    return a.engineGameId.localeCompare(b.engineGameId);
  });

  const startsByTeam = new Map<string, number[]>();
  const usedSlotIds = new Set<string>();

  const assignments: ScheduledAssignment[] = [];
  const unscheduled: string[] = [];

  const minRestMs = minRestMinutes * 60 * 1000;

  const canTeamPlayAt = (teamId: string, slotStart: number) => {
    const starts = startsByTeam.get(teamId);
    if (!starts || starts.length === 0) return true;
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

      if (canTeamPlayAt(homeId, slotStart) && canTeamPlayAt(awayId, slotStart)) {
        assignments.push({ engineGameId: g.engineGameId, slotId: slot.id });
        usedSlotIds.add(slot.id);
        addTeamStart(homeId, slotStart);
        addTeamStart(awayId, slotStart);
        placed = true;
        break;
      }
    }

    if (!placed) unscheduled.push(g.engineGameId);
  }

  return { assignments, unscheduled };
}

/**
 * Upgrade 6.3 meta returned to API/UI
 */
export type ScheduleMeta = {
  strategy: "HEURISTIC" | "OPTIMIZED";
  optimizerUsed: boolean;
  nodeBudget: number;
  nodesVisited: number;
};

/**
 * Backtracking optimizer (bounded):
 * Finds the maximum number of schedulable games that can be assigned to slots
 * under rest rules (including same-start-time conflicts).
 *
 * Deterministic and safe for small pools.
 */
function optimizeByBacktracking(args: {
  games: SchedulableGame[]; // resolved only
  slots: TimeSlotInput[];
  minRestMinutes: number;
  seedAssignments?: ScheduledAssignment[];
  nodeBudget?: number;
}): {
  assignments: ScheduledAssignment[];
  unscheduled: string[];
  meta: { nodesVisited: number; nodeBudget: number };
} {
  const { games, slots, minRestMinutes } = args;

  const sortedSlots = [...slots].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const minRestMs = minRestMinutes * 60 * 1000;

  const baseGames = [...games].sort((a, b) => {
    const d = stagePriority(a.stageType) - stagePriority(b.stageType);
    if (d !== 0) return d;
    return a.engineGameId.localeCompare(b.engineGameId);
  });

  const startMsBySlotId = new Map<string, number>();
  for (const s of sortedSlots) {
    const t = new Date(s.start).getTime();
    if (Number.isFinite(t)) startMsBySlotId.set(s.id, t);
  }

  const usedSlotIds = new Set<string>();
  const startsByTeam = new Map<string, number[]>();

  const canTeamPlayAt = (teamId: string, startMs: number) => {
    const starts = startsByTeam.get(teamId) ?? [];
    for (const prev of starts) {
      if (Math.abs(startMs - prev) < minRestMs) return false;
    }
    return true;
  };

  const addStart = (teamId: string, startMs: number) => {
    const arr = startsByTeam.get(teamId) ?? [];
    arr.push(startMs);
    startsByTeam.set(teamId, arr);
  };

  const removeStart = (teamId: string, startMs: number) => {
    const arr = startsByTeam.get(teamId) ?? [];
    const idx = arr.indexOf(startMs);
    if (idx >= 0) arr.splice(idx, 1);
    startsByTeam.set(teamId, arr);
  };

  const currentAssignments: ScheduledAssignment[] = [];

  let bestAssignments: ScheduledAssignment[] = args.seedAssignments
    ? [...args.seedAssignments]
    : [];
  const bestCountStart = bestAssignments.length;

  const budget = args.nodeBudget ?? 25000;
  let nodes = 0;

  const slotIds = sortedSlots
    .map((s) => s.id)
    .filter((id) => Number.isFinite(startMsBySlotId.get(id)));

  function feasibleSlotIdsForGameNow(g: SchedulableGame): string[] {
    const homeId = (g.homeRef as any).teamId as string;
    const awayId = (g.awayRef as any).teamId as string;

    const feasible: string[] = [];
    for (const slotId of slotIds) {
      if (usedSlotIds.has(slotId)) continue;
      const startMs = startMsBySlotId.get(slotId);
      if (startMs === undefined) continue;
      if (!canTeamPlayAt(homeId, startMs)) continue;
      if (!canTeamPlayAt(awayId, startMs)) continue;
      feasible.push(slotId);
    }
    return feasible;
  }

  function pickNextGameIndex(remaining: SchedulableGame[]): number {
    let bestIdx = 0;
    let bestCount = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const g = remaining[i];
      const feasible = feasibleSlotIdsForGameNow(g);
      const c = feasible.length;

      if (c < bestCount) {
        bestCount = c;
        bestIdx = i;
        if (c === 0) break;
      } else if (c === bestCount) {
        const cur = remaining[bestIdx];
        const d = stagePriority(g.stageType) - stagePriority(cur.stageType);
        if (d < 0) bestIdx = i;
        else if (d === 0 && g.engineGameId.localeCompare(cur.engineGameId) < 0)
          bestIdx = i;
      }
    }

    return bestIdx;
  }

  function dfs(remaining: SchedulableGame[]) {
    if (nodes++ > budget) return;

    const upperBound = currentAssignments.length + remaining.length;
    if (upperBound <= bestAssignments.length) return;

    if (remaining.length === 0) {
      if (currentAssignments.length > bestAssignments.length) {
        bestAssignments = [...currentAssignments];
      }
      return;
    }

    const idx = pickNextGameIndex(remaining);
    const g = remaining[idx];
    const rest = [...remaining.slice(0, idx), ...remaining.slice(idx + 1)];

    const homeId = (g.homeRef as any).teamId as string;
    const awayId = (g.awayRef as any).teamId as string;

    const feasible = feasibleSlotIdsForGameNow(g);

    for (const slotId of feasible) {
      const startMs = startMsBySlotId.get(slotId)!;

      usedSlotIds.add(slotId);
      addStart(homeId, startMs);
      addStart(awayId, startMs);
      currentAssignments.push({ engineGameId: g.engineGameId, slotId });

      dfs(rest);

      currentAssignments.pop();
      removeStart(homeId, startMs);
      removeStart(awayId, startMs);
      usedSlotIds.delete(slotId);
    }

    // allow leaving this game unscheduled
    dfs(rest);

    if (bestAssignments.length === baseGames.length) return;
  }

  dfs(baseGames);

  const best = bestAssignments.length >= bestCountStart ? bestAssignments : bestAssignments;

  const scheduledIds = new Set(best.map((a) => a.engineGameId));
  const unscheduled = baseGames
    .filter((g) => !scheduledIds.has(g.engineGameId))
    .map((g) => g.engineGameId);

  return {
    assignments: best,
    unscheduled,
    meta: { nodesVisited: nodes, nodeBudget: budget },
  };
}

/**
 * Upgrade 6 scheduler ("smart"):
 * - MRV + 1-step lookahead heuristic
 * - If it leaves games unscheduled, run bounded backtracking optimizer
 *   to maximize scheduledCount (and often find the full schedule if it exists).
 */
export function scheduleGamesSmart(args: {
  games: SchedulableGame[];
  slots: TimeSlotInput[];
  minRestMinutes: number;
}): {
  assignments: ScheduledAssignment[];
  unscheduled: string[];
  meta: ScheduleMeta;
} {
  const { games, slots, minRestMinutes } = args;

  const sortedSlots = [...slots].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const minRestMs = minRestMinutes * 60 * 1000;

  const startsByTeam = new Map<string, number[]>();
  const usedSlotIds = new Set<string>();

  const assignments: ScheduledAssignment[] = [];
  const unscheduled: string[] = [];

  const canTeamPlayAt = (teamId: string, slotStart: number) => {
    const starts = startsByTeam.get(teamId);
    if (!starts || starts.length === 0) return true;
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

  const remainingGames = [...games].sort((a, b) => {
    const d = stagePriority(a.stageType) - stagePriority(b.stageType);
    if (d !== 0) return d;
    return a.engineGameId.localeCompare(b.engineGameId);
  });

  const feasibleSlotsForGame = (g: SchedulableGame) => {
    if (!isTeamRef(g.homeRef) || !isTeamRef(g.awayRef)) return [];
    const homeId = g.homeRef.teamId;
    const awayId = g.awayRef.teamId;

    const feasible: Array<{ slot: TimeSlotInput; startMs: number }> = [];
    for (const slot of sortedSlots) {
      if (usedSlotIds.has(slot.id)) continue;
      const startMs = new Date(slot.start).getTime();
      if (!Number.isFinite(startMs)) continue;
      if (!canTeamPlayAt(homeId, startMs)) continue;
      if (!canTeamPlayAt(awayId, startMs)) continue;
      feasible.push({ slot, startMs });
    }
    return feasible;
  };

  const remainingPlayableSlotsForTeamIf = (teamId: string, addedStartMs: number) => {
    let count = 0;
    for (const slot of sortedSlots) {
      if (usedSlotIds.has(slot.id)) continue;
      const startMs = new Date(slot.start).getTime();
      if (!Number.isFinite(startMs)) continue;

      if (!canTeamPlayAt(teamId, startMs)) continue;
      if (Math.abs(startMs - addedStartMs) < minRestMs) continue;

      count += 1;
    }
    return count;
  };

  while (remainingGames.length > 0) {
    const unresolvedIdx = remainingGames.findIndex(
      (g) => !isTeamRef(g.homeRef) || !isTeamRef(g.awayRef)
    );
    if (unresolvedIdx !== -1) {
      const [u] = remainingGames.splice(unresolvedIdx, 1);
      unscheduled.push(u.engineGameId);
      continue;
    }

    let bestIdx = -1;
    let bestFeasibleCount = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remainingGames.length; i++) {
      const g = remainingGames[i];
      const feasible = feasibleSlotsForGame(g);
      const c = feasible.length;

      if (c < bestFeasibleCount) {
        bestFeasibleCount = c;
        bestIdx = i;
        if (c === 0) break;
      } else if (c === bestFeasibleCount && bestIdx !== -1) {
        const cur = remainingGames[bestIdx];
        const d = stagePriority(g.stageType) - stagePriority(cur.stageType);
        if (d < 0) bestIdx = i;
        else if (d === 0 && g.engineGameId.localeCompare(cur.engineGameId) < 0)
          bestIdx = i;
      }
    }

    const g = remainingGames.splice(bestIdx, 1)[0];

    const feasible = feasibleSlotsForGame(g);
    if (feasible.length === 0) {
      unscheduled.push(g.engineGameId);
      continue;
    }

    const homeId = (g.homeRef as any).teamId as string;
    const awayId = (g.awayRef as any).teamId as string;

    let chosen = feasible[0];
    let bestScore = -Infinity;

    for (const option of feasible) {
      const homeFlex = remainingPlayableSlotsForTeamIf(homeId, option.startMs);
      const awayFlex = remainingPlayableSlotsForTeamIf(awayId, option.startMs);

      const score = homeFlex + awayFlex + Math.min(homeFlex, awayFlex) * 0.25;

      const chosenStart = new Date(chosen.slot.start).getTime();
      const optionStart = option.startMs;

      const better =
        score > bestScore ||
        (score === bestScore &&
          (optionStart < chosenStart ||
            (optionStart === chosenStart &&
              option.slot.id.localeCompare(chosen.slot.id) < 0)));

      if (better) {
        bestScore = score;
        chosen = option;
      }
    }

    assignments.push({ engineGameId: g.engineGameId, slotId: chosen.slot.id });
    usedSlotIds.add(chosen.slot.id);
    addTeamStart(homeId, chosen.startMs);
    addTeamStart(awayId, chosen.startMs);
  }

  const resolvedGames = games.filter((g) => isTeamRef(g.homeRef) && isTeamRef(g.awayRef));

  if (unscheduled.length > 0 && slots.length > 0 && resolvedGames.length > 0) {
    const improved = optimizeByBacktracking({
      games: resolvedGames,
      slots,
      minRestMinutes,
      seedAssignments: assignments,
      nodeBudget: 25000,
    });

    return {
      assignments: improved.assignments,
      unscheduled: improved.unscheduled,
      meta: {
        strategy: "OPTIMIZED",
        optimizerUsed: true,
        nodeBudget: improved.meta.nodeBudget,
        nodesVisited: improved.meta.nodesVisited,
      },
    };
  }

  return {
    assignments,
    unscheduled,
    meta: {
      strategy: "HEURISTIC",
      optimizerUsed: false,
      nodeBudget: 0,
      nodesVisited: 0,
    },
  };
}

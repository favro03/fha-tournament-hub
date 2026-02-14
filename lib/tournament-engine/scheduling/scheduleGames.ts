import type { ParticipantRef } from "../types";

export type TimeSlotInput = {
  id: string;
  start: string;
  location: string;
};

export type SchedulableGame = {
  engineGameId: string;
  stageType: string;
  stageId?: string;
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

export function getMinRestMinutes(youthLevel: string) {
  const lvl = (youthLevel ?? "").toUpperCase();
  return lvl === "MITE" || lvl === "MITES" ? 60 : 120;
}

export type RestMinutesResolver = (g: SchedulableGame) => number;

function normalizeLevelToken(raw: string) {
  return (raw ?? "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .trim();
}

const MITE_TOKENS = new Set([
  "MINI_MITE",
  "MINI_MITES",
  "MITE",
  "MITES",
  "MITE1",
  "MITE2",
  "MITE3",
]);

const SQUIRT_PLUS_TOKENS = new Set([
  "SQUIRT",
  "SQUIRTS",
  "U10",
  "PEEWEE",
  "PEE_WEE",
  "U12",
  "BANTAM",
  "U14",
  "U15",
  "U16",
  "U18",
  "JV",
  "VARSITY",
]);

function tokenToRestMinutes(token: string) {
  const t = normalizeLevelToken(token);
  if (MITE_TOKENS.has(t)) return 60;
  if (SQUIRT_PLUS_TOKENS.has(t)) return 120;
  return 0;
}

/**
 * Extract a level token from stageId using multiple strategies:
 * 1) Split by ":" and check each segment
 * 2) Scan the whole string for known tokens
 */
export function parseLevelFromStageId(stageId?: string) {
  if (!stageId) return "";

  const raw = String(stageId);
  const parts = raw.split(":").map((p) => normalizeLevelToken(p));

  for (const p of parts) {
    if (tokenToRestMinutes(p) > 0) return p;
  }

  const whole = normalizeLevelToken(raw);

  const ordered = [
    "MINI_MITE",
    "MITE3",
    "MITE2",
    "MITE1",
    "MITE",
    "SQUIRT",
    "PEEWEE",
    "BANTAM",
    "U10",
    "U12",
    "U14",
    "U15",
    "U16",
    "U18",
    "JV",
    "VARSITY",
  ];

  for (const t of ordered) {
    const re = new RegExp(`(^|_)${t}(_|$)`);
    if (re.test(whole)) return t;
  }

  return "";
}

export function restMinutesForLevelToken(levelToken: string) {
  return tokenToRestMinutes(levelToken);
}

/**
 * Upgrade 8.6.4:
 * Allows an exact stageId→restMinutes map (from engineConfig) to override parsing.
 */
export function makeRestMinutesResolver(args: {
  fallbackMinutes: number;
  stageIdToRestMinutes?: Record<string, number>;
}): RestMinutesResolver {
  const fallback = Number.isFinite(args.fallbackMinutes)
    ? args.fallbackMinutes
    : 120;

  const stageMap = args.stageIdToRestMinutes ?? {};

  return (g) => {
    // 0) Exact stageId map (engineConfig-derived)
    if (g.stageId && Object.prototype.hasOwnProperty.call(stageMap, g.stageId)) {
      const m = Number(stageMap[g.stageId]);
      if (Number.isFinite(m) && m > 0) return m;
    }

    // 1) stageId token parsing
    const stageToken = parseLevelFromStageId(g.stageId);
    const byStage = restMinutesForLevelToken(stageToken);
    if (byStage > 0) return byStage;

    // 2) team-level on refs (future-proof if refs later include youthLevel/level)
    const refToken = (ref: ParticipantRef | null) => {
      const anyRef = ref as any;
      const t = anyRef?.youthLevel ?? anyRef?.level ?? anyRef?.division;
      return typeof t === "string" ? t : "";
    };
    const homeTok = restMinutesForLevelToken(refToken(g.homeRef));
    const awayTok = restMinutesForLevelToken(refToken(g.awayRef));
    const byRef = Math.max(homeTok, awayTok);
    if (byRef > 0) return byRef;

    // 3) fallback
    return fallback;
  };
}

export type UnscheduledReason = "NO_SLOT_AVAILABLE" | "REST_RULE_CONFLICT";

export type GreedyScheduleResult = {
  assignments: ScheduledAssignment[];
  unscheduled: string[];
  unscheduledDetailed: Array<{ engineGameId: string; reason: UnscheduledReason }>;
};

export function scheduleGamesGreedy(args: {
  games: SchedulableGame[];
  slots: TimeSlotInput[];
  minRestMinutes: number;
  restMinutesForGame?: RestMinutesResolver;
}): GreedyScheduleResult {
  const { games, slots, minRestMinutes, restMinutesForGame } = args;

  const sortedSlots = [...slots].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const sortedGames = [...games].sort((a, b) => {
    const pri = (g: SchedulableGame) =>
      g.stageType === "POOL_PLAY" ? 0 : g.stageType === "PLACEMENT" ? 1 : 2;
    const d = pri(a) - pri(b);
    if (d !== 0) return d;
    return a.engineGameId.localeCompare(b.engineGameId);
  });

  const startsByTeam = new Map<string, number[]>();
  const usedSlotIds = new Set<string>();

  const assignments: ScheduledAssignment[] = [];
  const unscheduled: string[] = [];
  const unscheduledDetailed: Array<{
    engineGameId: string;
    reason: UnscheduledReason;
  }> = [];

  const canTeamPlayAt = (
    teamId: string,
    slotStart: number,
    requiredRestMs: number
  ) => {
    const starts = startsByTeam.get(teamId);
    if (!starts || starts.length === 0) return true;
    for (const prev of starts) {
      if (Math.abs(slotStart - prev) < requiredRestMs) return false;
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
      unscheduledDetailed.push({
        engineGameId: g.engineGameId,
        reason: "NO_SLOT_AVAILABLE",
      });
      continue;
    }

    const homeId = g.homeRef.teamId;
    const awayId = g.awayRef.teamId;

    const gameRestMinutes = Number.isFinite(restMinutesForGame?.(g))
      ? (restMinutesForGame!(g) as number)
      : minRestMinutes;
    const gameRestMs = Math.max(0, gameRestMinutes) * 60 * 1000;

    let placed = false;
    let sawUnusedSlot = false;
    let sawRestConflict = false;

    for (const slot of sortedSlots) {
      if (usedSlotIds.has(slot.id)) continue;
      sawUnusedSlot = true;

      const slotStart = new Date(slot.start).getTime();
      if (!Number.isFinite(slotStart)) continue;

      const homeOk = canTeamPlayAt(homeId, slotStart, gameRestMs);
      const awayOk = canTeamPlayAt(awayId, slotStart, gameRestMs);

      if (homeOk && awayOk) {
        assignments.push({ engineGameId: g.engineGameId, slotId: slot.id });
        usedSlotIds.add(slot.id);
        addTeamStart(homeId, slotStart);
        addTeamStart(awayId, slotStart);
        placed = true;
        break;
      } else {
        sawRestConflict = true;
      }
    }

    if (!placed) {
      const reason: UnscheduledReason = sawUnusedSlot
        ? sawRestConflict
          ? "REST_RULE_CONFLICT"
          : "NO_SLOT_AVAILABLE"
        : "NO_SLOT_AVAILABLE";

      unscheduled.push(g.engineGameId);
      unscheduledDetailed.push({ engineGameId: g.engineGameId, reason });
    }
  }

  return { assignments, unscheduled, unscheduledDetailed };
}

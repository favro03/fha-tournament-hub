import type { ParticipantRef } from "../types";

export type TimeSlotInput = {
  id: string;
  start: string;
  location: string;
  allowedStageTypes?: string[];
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

// NOTE: This is REST-AFTER-END minutes, not "between starts".
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

export type GreedyScheduleDebug = {
  attemptCount: number;
  bestStrategy: string;
  triedStrategies: string[];
  attemptStats?: Array<{
    strategy: string;
    scheduledCount: number;
    restConflicts: number;
    noSlot: number;
  }>;
};

export type GreedyScheduleResultWithDebug = GreedyScheduleResult & {
  debug?: GreedyScheduleDebug;
};

function stageTypePriority(g: SchedulableGame) {
  return g.stageType === "POOL_PLAY" ? 0 : g.stageType === "PLACEMENT" ? 1 : 2;
}

function sortGamesDefault(games: SchedulableGame[]) {
  return [...games].sort((a, b) => {
    const d = stageTypePriority(a) - stageTypePriority(b);
    if (d !== 0) return d;
    return a.engineGameId.localeCompare(b.engineGameId);
  });
}

function sortGamesByStageId(games: SchedulableGame[]) {
  return [...games].sort((a, b) => {
    const d = stageTypePriority(a) - stageTypePriority(b);
    if (d !== 0) return d;
    const as = a.stageId ?? "";
    const bs = b.stageId ?? "";
    const ds = as.localeCompare(bs);
    if (ds !== 0) return ds;
    return a.engineGameId.localeCompare(b.engineGameId);
  });
}

function interleaveByStageId(games: SchedulableGame[]) {
  const base = sortGamesByStageId(games);
  const buckets = new Map<string, SchedulableGame[]>();
  for (const g of base) {
    const key = `${stageTypePriority(g)}::${g.stageId ?? ""}`;
    const arr = buckets.get(key) ?? [];
    arr.push(g);
    buckets.set(key, arr);
  }
  const keys = [...buckets.keys()].sort();
  const out: SchedulableGame[] = [];
  while (true) {
    let progressed = false;
    for (const k of keys) {
      const arr = buckets.get(k);
      if (arr && arr.length) {
        out.push(arr.shift()!);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return out;
}

function fnv1a32(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(items: T[], seed: number) {
  const arr = [...items];
  const rnd = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function sortGamesMostConstrainedFirst(args: {
  games: SchedulableGame[];
  minRestMinutes: number;
  restMinutesForGame?: RestMinutesResolver;
}) {
  const { games, minRestMinutes, restMinutesForGame } = args;

  const teamCounts = new Map<string, number>();
  for (const g of games) {
    if (isTeamRef(g.homeRef)) {
      teamCounts.set(
        g.homeRef.teamId,
        (teamCounts.get(g.homeRef.teamId) ?? 0) + 1
      );
    }
    if (isTeamRef(g.awayRef)) {
      teamCounts.set(
        g.awayRef.teamId,
        (teamCounts.get(g.awayRef.teamId) ?? 0) + 1
      );
    }
  }

  const restFor = (g: SchedulableGame) => {
    const m = Number.isFinite(restMinutesForGame?.(g))
      ? (restMinutesForGame!(g) as number)
      : minRestMinutes;
    return Math.max(0, m);
  };

  const score = (g: SchedulableGame) => {
    const homeN = isTeamRef(g.homeRef)
      ? teamCounts.get(g.homeRef.teamId) ?? 0
      : 0;
    const awayN = isTeamRef(g.awayRef)
      ? teamCounts.get(g.awayRef.teamId) ?? 0
      : 0;
    const crowd = homeN + awayN;
    const rest = restFor(g);
    // Heuristic: higher rest needs + teams that appear a lot → schedule earlier
    return rest * 1000 + crowd * 10 + stageTypePriority(g) * -1;
  };

  return [...games].sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    const ds = (a.stageId ?? "").localeCompare(b.stageId ?? "");
    if (ds !== 0) return ds;
    return a.engineGameId.localeCompare(b.engineGameId);
  });
}

/**
 * ✅ Upgrade 10:
 * Slots may restrict which stage types can be scheduled in them.
 * If allowedStageTypes is omitted/empty, the slot is treated as "allowed for all" (backward compatible).
 */
function slotAllowsStageType(slot: TimeSlotInput, stageType: string) {
  const allowed = slot.allowedStageTypes;
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(stageType);
}

function scheduleGamesGreedyCore(args: {
  gamesOrdered: SchedulableGame[];
  slots: TimeSlotInput[];
  minRestMinutes: number; // REST-AFTER-END minutes
  restMinutesForGame?: RestMinutesResolver; // REST-AFTER-END minutes
  gameDurationMinutes: number; // e.g. 60
}): GreedyScheduleResult {
  const {
    gamesOrdered,
    slots,
    minRestMinutes,
    restMinutesForGame,
    gameDurationMinutes,
  } = args;

  const gameDurationMs = Math.max(0, gameDurationMinutes) * 60 * 1000;

  const sortedSlots = [...slots].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

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
    requiredGapMs: number
  ) => {
    const starts = startsByTeam.get(teamId);
    if (!starts || starts.length === 0) return true;
    for (const prev of starts) {
      // Strict rule: nextStart must be >= prevStart + requiredGapMs
      if (Math.abs(slotStart - prev) < requiredGapMs) return false;
    }
    return true;
  };

  const addTeamStart = (teamId: string, slotStart: number) => {
    const arr = startsByTeam.get(teamId) ?? [];
    arr.push(slotStart);
    startsByTeam.set(teamId, arr);
  };

  for (const g of gamesOrdered) {
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

    // restAfterEndMinutes = minutes of break AFTER the game ends
    const restAfterEndMinutes = Number.isFinite(restMinutesForGame?.(g))
      ? (restMinutesForGame!(g) as number)
      : minRestMinutes;

    // Required gap between START times = game duration + rest after end
    const requiredGapMs =
      gameDurationMs + Math.max(0, restAfterEndMinutes) * 60 * 1000;

    let placed = false;
    let sawUnusedSlot = false;
    let sawRestConflict = false;

    for (const slot of sortedSlots) {
      if (usedSlotIds.has(slot.id)) continue;

      // ✅ Upgrade 10: enforce slot → stageType compatibility
      if (!slotAllowsStageType(slot, g.stageType)) continue;

      sawUnusedSlot = true;

      const slotStart = new Date(slot.start).getTime();
      if (!Number.isFinite(slotStart)) continue;

      const homeOk = canTeamPlayAt(homeId, slotStart, requiredGapMs);
      const awayOk = canTeamPlayAt(awayId, slotStart, requiredGapMs);

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

export function scheduleGamesGreedy(args: {
  games: SchedulableGame[];
  slots: TimeSlotInput[];
  minRestMinutes: number; // REST-AFTER-END
  restMinutesForGame?: RestMinutesResolver;
  gameDurationMinutes: number;
}): GreedyScheduleResult {
  const { games, slots, minRestMinutes, restMinutesForGame, gameDurationMinutes } =
    args;

  return scheduleGamesGreedyCore({
    gamesOrdered: sortGamesDefault(games),
    slots,
    minRestMinutes,
    restMinutesForGame,
    gameDurationMinutes,
  });
}

/**
 * Upgrade 8.7 – Smarter Slot Usage
 *
 * Run the greedy scheduler multiple times with different deterministic orderings,
 * keep the best result (max scheduled games).
 */
export function scheduleGamesGreedySmart(args: {
  games: SchedulableGame[];
  slots: TimeSlotInput[];
  minRestMinutes: number; // REST-AFTER-END
  restMinutesForGame?: RestMinutesResolver;
  gameDurationMinutes: number; // ✅ required now
  maxAttempts?: number; // default 7
}): GreedyScheduleResultWithDebug {
  const {
    games,
    slots,
    minRestMinutes,
    restMinutesForGame,
    gameDurationMinutes,
    maxAttempts,
  } = args;

  const attemptCap =
    typeof maxAttempts === "number" && maxAttempts > 0
      ? Math.min(10, Math.max(1, Math.floor(maxAttempts)))
      : 7;

  // Seed is derived from the game ids so results are stable for the same input.
  const seedBase = fnv1a32(
    sortGamesDefault(games)
      .map((g) => g.engineGameId)
      .join("|")
  );

  const strategies: Array<{ name: string; order: SchedulableGame[] }> = [];
  strategies.push({ name: "default", order: sortGamesDefault(games) });
  strategies.push({ name: "byStageId", order: sortGamesByStageId(games) });
  strategies.push({
    name: "interleaveStageId",
    order: interleaveByStageId(games),
  });
  strategies.push({
    name: "mostConstrainedFirst",
    order: sortGamesMostConstrainedFirst({
      games,
      minRestMinutes,
      restMinutesForGame,
    }),
  });

  // Add deterministic shuffles of the default ordering.
  const shuffleCount = Math.max(0, attemptCap - strategies.length);
  for (let i = 0; i < shuffleCount; i++) {
    const seed = (seedBase + i * 1013904223) >>> 0;
    strategies.push({
      name: `shuffle_${i + 1}`,
      order: deterministicShuffle(strategies[0].order, seed),
    });
  }

  const tried = strategies.slice(0, attemptCap);

  const attemptStats: Array<{
    strategy: string;
    scheduledCount: number;
    restConflicts: number;
    noSlot: number;
  }> = [];

  const countReasons = (r: GreedyScheduleResult) => {
    let restConflicts = 0;
    let noSlot = 0;
    for (const u of r.unscheduledDetailed) {
      if (u.reason === "REST_RULE_CONFLICT") restConflicts++;
      else if (u.reason === "NO_SLOT_AVAILABLE") noSlot++;
    }
    return { restConflicts, noSlot };
  };

  let bestName = tried[0]?.name ?? "default";
  let best = scheduleGamesGreedyCore({
    gamesOrdered: tried[0]?.order ?? sortGamesDefault(games),
    slots,
    minRestMinutes,
    restMinutesForGame,
    gameDurationMinutes,
  });

  {
    const c = countReasons(best);
    attemptStats.push({
      strategy: bestName,
      scheduledCount: best.assignments.length,
      restConflicts: c.restConflicts,
      noSlot: c.noSlot,
    });
  }

  const restConflictCount = (r: GreedyScheduleResult) =>
    r.unscheduledDetailed.filter((u) => u.reason === "REST_RULE_CONFLICT").length;

  const isBetter = (a: GreedyScheduleResult, b: GreedyScheduleResult) => {
    if (a.assignments.length !== b.assignments.length)
      return a.assignments.length > b.assignments.length;
    // Tie-break: fewer rest conflicts is better
    const ar = restConflictCount(a);
    const br = restConflictCount(b);
    if (ar !== br) return ar < br;
    // Final deterministic tie-break: compare assignment signature
    const sig = (r: GreedyScheduleResult) =>
      r.assignments
        .map((x) => `${x.slotId}:${x.engineGameId}`)
        .sort()
        .join("|");
    return sig(a) < sig(b);
  };

  for (let i = 1; i < tried.length; i++) {
    const t = tried[i];
    const res = scheduleGamesGreedyCore({
      gamesOrdered: t.order,
      slots,
      minRestMinutes,
      restMinutesForGame,
      gameDurationMinutes,
    });

    const c = countReasons(res);
    attemptStats.push({
      strategy: t.name,
      scheduledCount: res.assignments.length,
      restConflicts: c.restConflicts,
      noSlot: c.noSlot,
    });

    if (isBetter(res, best)) {
      best = res;
      bestName = t.name;
    }
  }

  return {
    ...best,
    debug: {
      attemptCount: tried.length,
      bestStrategy: bestName,
      triedStrategies: tried.map((t) => t.name),
      attemptStats,
    },
  };
}
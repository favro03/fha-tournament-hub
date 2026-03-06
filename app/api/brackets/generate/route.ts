// app/api/brackets/generate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePlan } from "@/lib/tournament-engine/generatePlan";
import type {
  TeamInput,
  GeneratorConfig,
  ParticipantRef,
} from "@/lib/tournament-engine/types";
import { parseLevelFromStageId } from "@/lib/tournament-engine/scheduling/scheduleGames";
import { generateSlotsMultiDay } from "@/lib/tournament-engine/scheduling/slotGenerator";
import {
  buildDefaultWeekendWindows,
  determineRinkLocations,
  parseTournamentWeekendDates,
} from "@/lib/orchestration/scheduleDefaults";
import { applyPlacementPlaceholderSchedule } from "@/lib/orchestration/placementPlaceholders";

function refToDisplayName(ref: ParticipantRef, teamsById: Map<string, string>) {
  if (ref.type === "TEAM") return teamsById.get(ref.teamId) ?? ref.teamId;
  if (ref.type === "POOL_RANK") return `Seed ${ref.rank}`;
  if (ref.type === "WINNER_OF") return `Winner of ${ref.gameId}`;
  if (ref.type === "LOSER_OF") return `Loser of ${ref.gameId}`;
  return "";
}

function countStageTypes(games: any[]) {
  return (games ?? []).reduce((acc: any, g: any) => {
    const k = String(g.stageType ?? "UNKNOWN");
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function filterSlotsByAllowedStage(slots: any[], stageType: string) {
  return (slots ?? []).filter((s) => {
    const allowed = (s?.allowedStageTypes ?? null) as string[] | null;
    if (!allowed || allowed.length === 0) return true;
    return allowed.includes(stageType);
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const {
    name,
    youthLevel,
    date,
    teams,
    config,
  }: {
    name: string;
    youthLevel: string;
    date: string;
    teams: TeamInput[];
    config: GeneratorConfig;
  } = body;

  if (!Array.isArray(teams) || teams.length < 2) {
    return NextResponse.json(
      { ok: false, error: "teams must be an array with at least 2 teams" },
      { status: 400 }
    );
  }

  let plan: any;
  try {
    plan = generatePlan({ config, teams });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to generate plan" },
      { status: 400 }
    );
  }

  if (!plan || !Array.isArray(plan.games)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid plan generated. Check config.type. Supported in this repo: ROUND_ROBIN, SINGLE_ELIMINATION, JAMBOREE.",
        debug: {
          receivedType: (config as any)?.type ?? null,
          hasGames: !!plan?.games,
        },
      },
      { status: 400 }
    );
  }

  const stageTypeCounts = countStageTypes(plan.games ?? []);
  const teamsById = new Map(teams.map((t) => [t.id, t.name]));

  // Persist stageIdLevels into engineConfig
  const inferredStageIdLevels: Record<string, string> = {};
  for (const g of plan.games ?? []) {
    if (!g?.stageId) continue;
    const token = parseLevelFromStageId(g.stageId);
    if (token) inferredStageIdLevels[g.stageId] = token;
  }

  const metaAny = plan.meta as any;

  const engineConfigToSave = {
    ...(config as any),
    stageIdLevels:
      metaAny?.stageIdLevels && typeof metaAny.stageIdLevels === "object"
        ? metaAny.stageIdLevels
        : inferredStageIdLevels,
    ...(metaAny?.stageIdRestMinutes &&
    typeof metaAny.stageIdRestMinutes === "object"
      ? { stageIdRestMinutes: metaAny.stageIdRestMinutes }
      : {}),
  };

  const created = await prisma.$transaction(async (tx) => {
    const bracket = await tx.bracket.create({
      data: {
        name,
        youthLevel,
        date,
        image: "",
        bracketName: "",
        tournamentFormat:
          config.type === "JAMBOREE" ? "JAMBOREE" : "POOL_PLACEMENT",
        format: plan.format,
        engineConfig: engineConfigToSave as any,
        standingsRules: (plan.meta?.standingsRules ?? null) as any,
      },
    });

    await tx.team.createMany({
      data: teams.map((t) => ({
        teamName: t.name,
        bracketId: bracket.id,
      })),
    });

    await tx.game.createMany({
      data: plan.games.map((g: any) => ({
        bracketId: bracket.id,
        engineGameId: g.id,
        stageType: g.stageType,
        stageId: g.stageId,
        round: g.round ?? null,
        status: g.status,

        homeRef: g.home as any,
        awayRef: g.away as any,
        result: g.result ? (g.result as any) : null,

        homeTeam: refToDisplayName(g.home, teamsById),
        awayTeam: refToDisplayName(g.away, teamsById),
        day: "",
        date: "",
        time: "",
        location: "",
        homeScore: g.result?.homeScore ?? 0,
        awayScore: g.result?.awayScore ?? 0,
        homePenalty: g.result?.homePim ?? 0,
        awayPenalty: g.result?.awayPim ?? 0,
        gameType: plan.format,
        label:
          g.stageType === "PLACEMENT"
            ? "Placement"
            : g.stageType === "JAMBOREE"
              ? "Jamboree"
              : "Pool Play",
      })),
    });

    return bracket;
  });

  // ------------------------------
  // Phase 1: Auto-schedule on create
  // ------------------------------

  const normalizedLevel = String(youthLevel ?? "").trim().toUpperCase();

  const rule =
    (await prisma.tournamentRule.findUnique({
      where: { youthLevel: normalizedLevel },
      select: { gameMinutes: true, zamboniMinutes: true },
    })) ?? null;

  const intervalMinutes =
    (rule?.gameMinutes ?? 60) + (rule?.zamboniMinutes ?? 15);

  const { friISO, satISO, sunISO } = parseTournamentWeekendDates(date);

  // Default windows (Sun is split: AM Pool, PM Placement)
  let dayWindows = buildDefaultWeekendWindows({ friISO, satISO, sunISO });

  const locations = determineRinkLocations(normalizedLevel);
  let slots = generateSlotsMultiDay({ dayWindows, intervalMinutes, locations });

  // Persist schedule defaults in engineConfig (initial)
  await prisma.bracket.update({
    where: { id: created.id },
    data: {
      engineConfig: {
        ...(engineConfigToSave as any),
        scheduleDefaults: {
          kind: "WEEKEND_FRI_SUN_V1",
          timezone: "America/Chicago",
          intervalMinutes,
          locations,
          dayWindows,
        },
      } as any,
    },
  });

  const origin = new URL(req.url).origin;

  // --- POOL_PLAY scheduling (2 pass) ---
  const poolOnlySlots = filterSlotsByAllowedStage(slots as any[], "POOL_PLAY");

  const scheduleResA = await fetch(
    `${origin}/api/brackets/${created.id}/schedule?debug=1`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageTypes: ["POOL_PLAY"],
        slots: poolOnlySlots,
      }),
      cache: "no-store",
    }
  );

  const poolScheduleA = await scheduleResA
    .json()
    .catch(() => ({ ok: false, error: "Failed to parse schedule response" }));

  const unscheduledCountA = Number(poolScheduleA?.unscheduledCount ?? 0);

  let poolScheduleJson: any = poolScheduleA;
  let finalUnscheduledCount: number =
    Number(poolScheduleA?.unscheduledCount ?? 0);

  if (unscheduledCountA > 0) {
    const scheduleResB = await fetch(
      `${origin}/api/brackets/${created.id}/schedule?debug=1`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageTypes: ["POOL_PLAY"],
          slots: poolOnlySlots,
        }),
        cache: "no-store",
      }
    );

    const poolScheduleB = await scheduleResB
      .json()
      .catch(() => ({ ok: false, error: "Failed to parse schedule response" }));

    finalUnscheduledCount = Number(
      poolScheduleB?.unscheduledCount ?? poolScheduleA?.unscheduledCount ?? 0
    );

    poolScheduleJson = {
      ...poolScheduleA,
      secondPass: {
        ok: !!poolScheduleB?.ok,
        scheduledCount: poolScheduleB?.scheduledCount ?? null,
        unscheduledCount: poolScheduleB?.unscheduledCount ?? null,
        unscheduledDetailed: poolScheduleB?.unscheduledDetailed ?? null,
      },
      finalUnscheduledCount,
      unscheduledDetailed:
        poolScheduleA?.unscheduledDetailed ??
        poolScheduleB?.unscheduledDetailed ??
        null,
    };
  }

  // ✅ NEW: If NO Sunday AM pool play is needed, move placement earlier (Sun 8:00–16:00)
  // This ONLY changes the slot windows for PLACEMENT placeholders.
  let placementSlotsToUse = slots;

  if (finalUnscheduledCount === 0) {
    dayWindows = [
      // Fri Pool
      {
        dateISO: friISO,
        startTime: "17:15",
        lastStartTime: "20:00",
        label: "Fri Pool Play",
        allowedStageTypes: ["POOL_PLAY"],
      },
      // Sat Pool
      {
        dateISO: satISO,
        startTime: "08:00",
        lastStartTime: "20:00",
        label: "Sat Pool Play",
        allowedStageTypes: ["POOL_PLAY"],
      },
      // Sun Placement only, early start
      {
        dateISO: sunISO,
        startTime: "08:00",
        lastStartTime: "16:00",
        label: "Sun Placement (Early)",
        allowedStageTypes: ["PLACEMENT"],
      },
    ];

    placementSlotsToUse = generateSlotsMultiDay({
      dayWindows,
      intervalMinutes,
      locations,
    });

    // Update persisted defaults so regen matches reality
    await prisma.bracket.update({
      where: { id: created.id },
      data: {
        engineConfig: {
          ...(engineConfigToSave as any),
          scheduleDefaults: {
            kind: "WEEKEND_FRI_SUN_V1",
            timezone: "America/Chicago",
            intervalMinutes,
            locations,
            dayWindows,
          },
        } as any,
      },
    });
  }

  // --- PLACEMENT placeholders ---
  const placementScheduled = await applyPlacementPlaceholderSchedule({
    bracketId: created.id,
    slots: placementSlotsToUse as any,
  });

  const sampleStageIds = Array.from(
    new Set((plan.games as any[]).map((g) => g.stageId).filter(Boolean))
  ).slice(0, 10);

  return NextResponse.json({
    ok: true,
    bracketId: created.id,
    format: plan.format,
    savedYouthLevel: youthLevel,
    sampleStageIds,
    savedEngineConfigStageIdLevels: engineConfigToSave.stageIdLevels ?? {},
    debugPlan: {
      receivedConfig: config,
      stageTypeCounts,
    },
    autoSchedule: {
      intervalMinutes,
      locations,
      dayWindows,
      poolSchedule: {
        ok: !!poolScheduleJson?.ok,
        scheduledCount: poolScheduleJson?.scheduledCount ?? null,
        unscheduledCount: poolScheduleJson?.unscheduledCount ?? null,
        unscheduledDetailed: poolScheduleJson?.unscheduledDetailed ?? null,
        secondPass: poolScheduleJson?.secondPass ?? null,
        finalUnscheduledCount:
          poolScheduleJson?.finalUnscheduledCount ?? finalUnscheduledCount ?? null,
      },
      placementPlaceholders: placementScheduled,
      placementEarlyIfNoSundayPoolNeeded: finalUnscheduledCount === 0,
    },
  });
}
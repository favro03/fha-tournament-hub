// app/api/brackets/[bracketId]/generate-jamboree/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateJamboree } from "@/lib/tournament-engine/formats/jamboree";
import type { TeamInput } from "@/lib/tournament-engine/types";

type Body = {
  /** One or more groups (typically: MINI_MITE, MITE1, MITE2, MITE3, etc.) */
  groups: Array<{
    level: string;
    teams: TeamInput[];
  }>;

  /** Desired games each team should play (per group). */
  gamesPerTeam: number;

  /** Optional. Defaults: stageType=JAMBOREE, stageId=`<level>` */
  options?: {
    stageIdPrefix?: string; // e.g. "day1" -> stageId "day1:MINI_MITE"
    clearExisting?: boolean; // default true
  };
};

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ bracketId: string }> }
) {
  try {
    const { bracketId: bracketIdParam } = await ctx.params;
    const bracketId = Number(bracketIdParam);
    if (!Number.isFinite(bracketId)) {
      return NextResponse.json({ ok: false, error: "Invalid bracketId" }, { status: 400 });
    }

    const body = (await req.json()) as Body;
    if (!body?.groups || !Array.isArray(body.groups) || body.groups.length === 0) {
      return NextResponse.json({ ok: false, error: "groups[] is required" }, { status: 400 });
    }
    if (!Number.isFinite(body.gamesPerTeam) || body.gamesPerTeam <= 0) {
      return NextResponse.json(
        { ok: false, error: "gamesPerTeam must be a positive number" },
        { status: 400 }
      );
    }

    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      select: { id: true },
    });
    if (!bracket) {
      return NextResponse.json({ ok: false, error: "Bracket not found" }, { status: 404 });
    }

    const clearExisting = body.options?.clearExisting ?? true;
    const stageIdPrefix = body.options?.stageIdPrefix?.trim() ?? "";

    // Build all games in-memory first
    const plannedGames: Array<{
      engineGameId: string;
      stageId: string;
      round: number | null;
      homeRef: any;
      awayRef: any;
      homeTeam: string;
      awayTeam: string;
      label: string;
    }> = [];

    const stageIds: string[] = [];

    for (const group of body.groups) {
      const level = String(group.level ?? "").trim();
      const teams = Array.isArray(group.teams) ? group.teams : [];

      if (!level) {
        return NextResponse.json(
          { ok: false, error: "Each group must have a non-empty level" },
          { status: 400 }
        );
      }
      if (teams.length < 2) {
        return NextResponse.json(
          { ok: false, error: `Group '${level}' must have at least 2 teams` },
          { status: 400 }
        );
      }
      if (teams.some((t) => !t?.id || !t?.name)) {
        return NextResponse.json(
          { ok: false, error: `Group '${level}' teams must include {id, name}` },
          { status: 400 }
        );
      }

      const stageId = stageIdPrefix ? `${stageIdPrefix}:${level}` : level;
      stageIds.push(stageId);

      const plan = generateJamboree({
        config: { type: "JAMBOREE", gamesPerTeam: body.gamesPerTeam },
        teams,
      });

      // Make ids unique across multiple groups
      let idx = 1;
      for (const g of plan.games) {
        const homeName =
          teams.find((t) => t.id === (g.home as any).teamId)?.name ?? "";
        const awayName =
          teams.find((t) => t.id === (g.away as any).teamId)?.name ?? "";

        const engineGameId = `jamb_${level}_${idx}`;
        idx++;

        plannedGames.push({
          engineGameId,
          stageId,
          round: g.round ?? null,
          homeRef: g.home as any,
          awayRef: g.away as any,
          homeTeam: homeName,
          awayTeam: awayName,
          label: `${level} Jamboree`,
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Mark bracket as JAMBOREE format
      await tx.bracket.update({
        where: { id: bracketId },
        data: { tournamentFormat: "JAMBOREE" },
      });

      if (clearExisting) {
        // Clear any scheduled Times rows used by existing JAMBOREE games
        const gamesToClear = await tx.game.findMany({
          where: {
            bracketId,
            stageType: "JAMBOREE",
            OR: [{ timesId: { not: null } }, { status: "SCHEDULED" }],
          },
          select: { timesId: true },
        });

        const timesIds = gamesToClear
          .map((g) => g.timesId)
          .filter((id): id is number => typeof id === "number" && Number.isFinite(id));

        // Hard-delete existing JAMBOREE games (so regenerate is idempotent)
        await tx.game.deleteMany({
          where: { bracketId, stageType: "JAMBOREE" },
        });

        if (timesIds.length) {
          await tx.times.deleteMany({ where: { id: { in: uniq(timesIds) } } });
        }
      }

      // Create new games
      await tx.game.createMany({
        data: plannedGames.map((g) => ({
          bracketId,
          engineGameId: g.engineGameId,
          stageType: "JAMBOREE",
          stageId: g.stageId,
          round: g.round,
          status: "UNSCHEDULED",
          homeRef: g.homeRef,
          awayRef: g.awayRef,
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          day: "",
          date: "",
          time: "",
          location: "",
          homeScore: 0,
          awayScore: 0,
          homePenalty: 0,
          awayPenalty: 0,
          gameType: "JAMBOREE",
          label: g.label,
        })),
        skipDuplicates: true,
      });

      return {
        createdGameCount: plannedGames.length,
        stageIds: uniq(stageIds),
      };
    });

    return NextResponse.json({
      ok: true,
      bracketId,
      tournamentFormat: "JAMBOREE",
      gamesPerTeam: body.gamesPerTeam,
      groups: body.groups.map((g) => ({ level: g.level, teamCount: g.teams.length })),
      createdGameCount: result.createdGameCount,
      stageTypesApplied: ["JAMBOREE"],
      stageIds: result.stageIds,
    });
  } catch (err: any) {
    console.error("GENERATE JAMBOREE ERROR:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Internal Server Error",
        code: err?.code,
        meta: err?.meta,
      },
      { status: 500 }
    );
  }
}

// lib/orchestration/placementPlaceholders.ts
import { prisma } from "@/lib/prisma";
import {
  formatISODateInTZ,
  formatTimeHMInTZ,
  formatWeekdayShortInTZ,
} from "@/lib/orchestration/timeFormat";

type PlacementSlot = {
  start: string;
  location: string;
  allowedStageTypes?: string[];
};

function slotAllowsPlacement(slot: PlacementSlot) {
  const allowed = slot.allowedStageTypes;
  // If not provided, treat as "allowed" (backward compatible)
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes("PLACEMENT");
}

/**
 * Phase 1 requirement: schedule PLACEMENT games as placeholders (Seed vs Seed)
 * into Sunday PM placement-only slots, without resolving TEAM vs TEAM.
 *
 * We intentionally do NOT apply rest rules here because participants are not known yet.
 * Pool play scheduling still enforces rest rules via /api/brackets/:id/schedule.
 */
export async function applyPlacementPlaceholderSchedule(args: {
  bracketId: number;
  slots: PlacementSlot[];
}): Promise<{
  scheduledCount: number;
  unscheduledCount: number;
  usedSlotCount: number;
}> {
  const { bracketId, slots } = args;

  const placementSlots = (slots ?? [])
    .filter((s) => !!s?.start && !!s?.location)
    .filter((s) => slotAllowsPlacement(s))
    .filter((s) => Number.isFinite(new Date(s.start).getTime()))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (placementSlots.length === 0) {
    return { scheduledCount: 0, unscheduledCount: 0, usedSlotCount: 0 };
  }

  // IMPORTANT: don't require status === "UNSCHEDULED"
  // We only care whether it already has a slot assigned.
  const games = await prisma.game.findMany({
    where: {
      bracketId,
      stageType: "PLACEMENT",
      timesId: null,
    },
    select: { engineGameId: true },
    orderBy: [{ round: "asc" }, { engineGameId: "asc" }],
  });

  if (games.length === 0) {
    return { scheduledCount: 0, unscheduledCount: 0, usedSlotCount: 0 };
  }

  const toSchedule = games.slice(0, placementSlots.length);

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < toSchedule.length; i++) {
      const g = toSchedule[i];
      const slot = placementSlots[i];
      const dt = new Date(slot.start);

      const day = formatWeekdayShortInTZ(dt);
      const date = formatISODateInTZ(dt);
      const time = formatTimeHMInTZ(dt);

      const timesRow = await tx.times.create({
        data: {
          bracketId,
          day,
          date,
          timeSlots: slot.start,
          location: slot.location,
          gameType: "",
          type: "SLOT",
        },
        select: { id: true },
      });

      await tx.game.update({
        where: {
          bracketId_engineGameId: {
            bracketId,
            engineGameId: g.engineGameId,
          },
        },
        data: {
          timesId: timesRow.id,
          day,
          date,
          time,
          location: slot.location,
          status: "SCHEDULED",
        },
      });
    }
  });

  return {
    scheduledCount: toSchedule.length,
    unscheduledCount: Math.max(0, games.length - toSchedule.length),
    usedSlotCount: toSchedule.length,
  };
}
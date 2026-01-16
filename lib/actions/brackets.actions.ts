"use server";
import { prisma } from "../../db/prisma";
import type { Prisma } from "@prisma/client";
import { convertToPlainObject, formatError } from "../utils";
import { revalidatePath } from "next/cache";
import { insertBracketSchema, updateBracketSchema, timeSchema } from "../validators";
import { z } from "zod";

// Get all brackets
export async function getBrackets() {
  const data = await prisma.bracket.findMany({
    include: { games: true, teams: true, times: true },
  });
  return convertToPlainObject(data);
}

// Create a bracket
export async function createBracket(data: z.infer<typeof insertBracketSchema> & { teams?: { teamName: string }[], times?: z.infer<typeof timeSchema>[] }) {
  try {
    const bracket = insertBracketSchema.parse(data);
    const { games, teams, times, ..._ } = bracket;
    const createData: Prisma.BracketCreateInput = {
      name: bracket.name,
      youthLevel: bracket.youthLevel ?? '',
      date: bracket.date ?? '',
      image: bracket.image && bracket.image.trim() !== '' ? bracket.image : '',
      bracketName: bracket.name, // Add bracketName, default to name
      games: games && Array.isArray(games) && games.length > 0
        ? {
            create: games.map(g => ({
              day: g.day ?? '',
              date: g.date ?? '',
              time: g.time ?? '',
              location: g.location ?? '',
              homeTeam: g.homeTeam ?? '',
              awayTeam: g.awayTeam ?? '',
              homeScore: g.homeScore ?? 0,
              awayScore: g.awayScore ?? 0,
              label: g.label ?? undefined,
            })),
          }
        : undefined,
      teams: teams && Array.isArray(teams) && teams.length > 0
        ? {
            create: teams.map(t => ({ teamName: t.teamName ?? t })),
          }
        : undefined,
      times: times && Array.isArray(times) && times.length > 0
        ? {
            create: times.map(ts => ({
              day: ts.day ?? '',
              date: ts.date ?? '',
              timeSlots: ts.timeSlots ?? '',
              location: ts.location ?? '',
              gameType: ts.gameType ?? '',
              type: ts.type ?? '',
            })),
          }
        : undefined,
    };
    await prisma.bracket.create({ data: createData });
    revalidatePath("/admin/brackets");
    revalidatePath("/brackets");
    return {
      success: true,
      message: "Bracket created successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update a bracket
export async function updateBracket(id: string, data: z.infer<typeof updateBracketSchema> & { teams?: { teamName: string }[], times?: z.infer<typeof timeSchema>[] }) {
  try {
    const updateData = updateBracketSchema.parse(data);
    const bracketId = typeof id === "string" ? Number(id) : id;
    const bracketExists = await prisma.bracket.findFirst({
      where: { id: bracketId },
    });
    if (!bracketExists) throw new Error("Bracket not found");

    // If games are provided, replace all games for this bracket
    if (Array.isArray(updateData.games)) {
      await prisma.game.deleteMany({ where: { bracketId } });
    }
    // If teams are provided, replace all teams for this bracket
    if (Array.isArray(updateData.teams)) {
      await prisma.team.deleteMany({ where: { bracketId } });
    }
    // If timeSlots are provided, replace all timeSlots for this bracket
    if (Array.isArray(updateData.times)) {
      await prisma.times.deleteMany({ where: { bracketId } });
    }
    await prisma.bracket.update({
      where: { id: bracketId },
      data: {
        name: updateData.name,
        youthLevel: updateData.youthLevel,
        date: updateData.date,
        image: updateData.image && updateData.image.trim() !== '' ? updateData.image : '',
        bracketName: updateData.name, // Add bracketName, default to name
        games: Array.isArray(updateData.games) && updateData.games.length > 0
          ? {
              create: updateData.games.map(g => ({
                day: g.day ?? '',
                date: g.date ?? '',
                time: g.time ?? '',
                location: g.location ?? '',
                homeTeam: g.homeTeam ?? '',
                awayTeam: g.awayTeam ?? '',
                homeScore: g.homeScore ?? 0,
                awayScore: g.awayScore ?? 0,
                label: g.label ?? undefined,
              })),
            }
          : undefined,
        teams: Array.isArray(updateData.teams) && updateData.teams.length > 0
          ? {
              create: updateData.teams.map(t => ({ teamName: t.teamName ?? t })),
            }
          : undefined,
        times: Array.isArray(updateData.times) && updateData.times.length > 0
          ? {
              create: updateData.times.map(ts => ({
                day: ts.day ?? '',
                date: ts.date ?? '',
                timeSlots: ts.timeSlots ?? '',
                location: ts.location ?? '',
                gameType: ts.gameType ?? '',
                type: ts.type ?? '',
              })),
            }
          : undefined,
      },
    });

    revalidatePath("/admin/brackets");
    revalidatePath("/brackets");
    return {
      success: true,
      message: "Bracket updated successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Delete a bracket
export async function deleteBracket(id: string) {
  try {
    const bracketId = typeof id === "string" ? Number(id) : id;
    await prisma.bracket.delete({ where: { id: bracketId } });
    revalidatePath("/admin/brackets");
    revalidatePath("/brackets");
    return {
      success: true,
      message: "Bracket deleted successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get single bracket by its ID
export async function getBracketById(bracketId: string) {
  const id = typeof bracketId === "string" ? Number(bracketId) : bracketId;
  const data = await prisma.bracket.findFirst({
    where: { id },
    include: { games: true, teams: true, times: true },
  });
  return data ? convertToPlainObject(data) : null;
}


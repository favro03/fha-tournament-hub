"use server";
import { prisma } from "../../db/prisma";
import type { Prisma } from "@prisma/client";
import { convertToPlainObject, formatError } from "../utils";
import { revalidatePath } from "next/cache";
import { insertBracketSchema, updateBracketSchema } from "../validators";
import { z } from "zod";

// Get all brackets
export async function getBrackets() {
  const data = await prisma.bracket.findMany({
    include: { games: true },
  });
  return convertToPlainObject(data);
}

// Create a bracket
export async function createBracket(data: z.infer<typeof insertBracketSchema>) {
  try {
    const bracket = insertBracketSchema.parse(data);
    const { games, ..._ } = bracket;
    const createData: Prisma.BracketCreateInput = {
      name: bracket.name,
      youthLevel: bracket.youthLevel ?? '',
      date: bracket.date ?? '',
      image: bracket.image && bracket.image.trim() !== '' ? bracket.image : '',
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
export async function updateBracket(id: string, data: z.infer<typeof updateBracketSchema>) {
  try {
    const updateData = updateBracketSchema.parse(data);
    const bracketId = typeof id === "string" ? Number(id) : id;
    const bracketExists = await prisma.bracket.findFirst({
      where: { id: bracketId },
    });
    if (!bracketExists) throw new Error("Bracket not found");

    await prisma.bracket.update({
      where: { id: bracketId },
      data: {
        name: updateData.name,
        youthLevel: updateData.youthLevel,
        date: updateData.date,
        image: updateData.image && updateData.image.trim() !== '' ? updateData.image : '',
        // Do not include games here
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
    include: { games: true },
  });
  return data ? convertToPlainObject(data) : null;
}


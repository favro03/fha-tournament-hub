
"use server";
import { createBracket, updateBracket } from "@/lib/actions/brackets.actions";
import { insertBracketSchema, updateBracketSchema } from "@/lib/validators";
import type { z } from "zod";
import { redirect } from "next/navigation";

export async function updateBracketServerAction(
  prevState: unknown,
  formData: FormData
): Promise<ReturnType<typeof updateBracket>> {
  // Convert FormData to object
  const values: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    values[key] = value;
  }
  // Parse games JSON if present
  let parsedGames: unknown = undefined;
  if (values.games) {
    try {
      const parsed = JSON.parse(values.games as string);
      parsedGames = Array.isArray(parsed) ? parsed : undefined;
    } catch {
      parsedGames = undefined;
    }
  }
  // bracketId must be present for update
  const id = (values.id || values.bracketId) as string;
  // Build update data with correct type
  const data: z.infer<typeof updateBracketSchema> = {
    name: values.name as string,
    youthLevel: values.youthLevel as string | undefined,
    date: values.date as string | undefined,
    image: values.image as string | undefined,
    games: Array.isArray(parsedGames) ? parsedGames : undefined,
  };
  const res = await updateBracket(id, data);
  if (res.success) {
    redirect("/admin/brackets");
  }
  return res;
}

export async function createBracketServerAction(
  prevState: unknown,
  formData: FormData
): Promise<ReturnType<typeof createBracket>> {
  // Convert FormData to object
  const values: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    values[key] = value;
  }
  // Parse games JSON if present
  let parsedGames: unknown = undefined;
  if (values.games) {
    try {
      const parsed = JSON.parse(values.games as string);
      parsedGames = Array.isArray(parsed) ? parsed : undefined;
    } catch {
      parsedGames = undefined;
    }
  }
  // Build create data with correct type
  const data: z.infer<typeof insertBracketSchema> = {
    name: values.name as string,
    youthLevel: values.youthLevel as string | undefined,
    date: values.date as string | undefined,
    image: values.image as string | undefined,
    games: Array.isArray(parsedGames) ? parsedGames : undefined,
  };
  const res = await createBracket(data);
  if (res.success) {
    redirect("/admin/brackets");
  }
  return res;
}

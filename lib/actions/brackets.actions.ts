'use server';
import { prisma } from '../../db/prisma';
import { convertToPlainObject, formatError } from '../utils';
import { revalidatePath } from "next/cache";
import { insertBracketSchema, updateBracketSchema } from '../validators';

import { z } from 'zod';

//Get All Brackets
export async function getBrackets() {
    const data = await prisma.bracket.findMany();
    return convertToPlainObject(data);
}


// Create a bracket
export async function createBracket(data: z.infer<typeof insertBracketSchema>) {
  
    try {
        const bracket = insertBracketSchema.parse(data);
        // Ensure website is always a string
        const bracketData = {
          ...bracket,
         
        };
    await prisma.bracket.create({ data: bracketData });
    revalidatePath('/admin/brackets');
      revalidatePath('/brackets');

    return {
      success: true,
      message: 'Bracket created successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update a bracket
export async function updateBracket(id: string, data: z.infer<typeof updateBracketSchema>) {
  try {
    const updateData = updateBracketSchema.parse(data);
    const bracketId = typeof id === 'string' ? Number(id) : id;
    const bracketExists = await prisma.bracket.findFirst({
      where: { id: bracketId },
    });

    if (!bracketExists) throw new Error('Bracket not found');

    await prisma.bracket.update({
      where: { id: bracketId },
      data: updateData,
    });

    revalidatePath('/admin/brackets');
      revalidatePath('/brackets');

    return {
      success: true,
      message: 'Bracket updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

//Delete a bracket
export async function deleteBracket(id: string) {
    try {
      const bracketId = typeof id === 'string' ? Number(id) : id;
      await prisma.bracket.delete({ where: { id: bracketId } });

      revalidatePath('/admin/brackets');
        revalidatePath('/brackets');
      return {
        success: true,
        message: 'Bracket deleted successfully',
      };
    } catch (error) {
      return { success: false, message: formatError(error) };
    }
}

// Get single bracket by it's ID
export async function getBracketById(bracketId: string) {
  const id = typeof bracketId === 'string' ? Number(bracketId) : bracketId;
  const data = await prisma.bracket.findFirst({
    where: { id },
  });

  return convertToPlainObject(data);
}


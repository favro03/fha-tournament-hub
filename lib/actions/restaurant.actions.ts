'use server';
import { prisma } from '../../db/prisma';
import { convertToPlainObject, formatError } from '../utils';
import { revalidatePath } from "next/cache";
import { insertRestaurantSchema, updateRestaurantSchema } from '../validators';
import { z } from 'zod';

//Get All Restaurants
export async function getRestaurants() {
    const data = await prisma.restaurant.findMany();
    return convertToPlainObject(data);
}

// Create a restaurant
export async function createRestaurant(data: z.infer<typeof insertRestaurantSchema>) {
  try {
    const restaurant = insertRestaurantSchema.parse(data);
    // Ensure website is always a string
    const restaurantData = {
      ...restaurant,
      website: restaurant.website ?? '',
    };
    await prisma.restaurant.create({ data: restaurantData });
    revalidatePath('/admin/restaurants');
      revalidatePath('/restaurants');

    return {
      success: true,
      message: 'Restaurant created successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update a restaurant
export async function updateRestaurant(id: string, data: z.infer<typeof updateRestaurantSchema>) {
  try {
    const updateData = updateRestaurantSchema.parse(data);
    const restaurantId = typeof id === 'string' ? Number(id) : id;
    const restaurantExists = await prisma.restaurant.findFirst({
      where: { id: restaurantId },
    });

    if (!restaurantExists) throw new Error('Restaurant not found');

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: updateData,
    });

    revalidatePath('/admin/restaurants');
      revalidatePath('/restaurants');

    return {
      success: true,
      message: 'Restaurant updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

//Delete a restaurant
export async function deleteRestaurant(id: string) {
    try {
      const restaurantId = typeof id === 'string' ? Number(id) : id;
      await prisma.restaurant.delete({ where: { id: restaurantId } });

      revalidatePath('/admin/restaurants');
        revalidatePath('/restaurants');
      return {
        success: true,
        message: 'Restaurant deleted successfully',
      };
    } catch (error) {
      return { success: false, message: formatError(error) };
    }
}

// Get single restaurant by it's ID
export async function getRestaurantById(restaurantId: string) {
  const id = typeof restaurantId === 'string' ? Number(restaurantId) : restaurantId;
  const data = await prisma.restaurant.findFirst({
    where: { id },
  });

  return convertToPlainObject(data);
}

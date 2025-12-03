'use server';
import { prisma } from '../../db/prisma';
import { convertToPlainObject, formatError } from '../utils';
import { revalidatePath } from "next/cache";
import { insertHotelSchema, updateHotelSchema } from '../validators';
import { z } from 'zod';

//Get All Hotels
export async function getHotels() {
    const data = await prisma.hotel.findMany();
    return convertToPlainObject(data);
}

// Create a hotel
export async function createHotel(data: z.infer<typeof insertHotelSchema>) {
  try {
    const hotel = insertHotelSchema.parse(data);
    // Ensure website is always a string
    const hotelData = {
      ...hotel,
      website: hotel.website ?? '',
    };
    await prisma.hotel.create({ data: hotelData });
    revalidatePath('/admin/hotels');

    return {
      success: true,
      message: 'Hotel created successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update a hotel
export async function updateHotel(id: string, data: z.infer<typeof updateHotelSchema>) {
  try {
    const updateData = updateHotelSchema.parse(data);
    const hotelId = typeof id === 'string' ? Number(id) : id;
    const hotelExists = await prisma.hotel.findFirst({
      where: { id: hotelId },
    });

    if (!hotelExists) throw new Error('Hotel not found');

    await prisma.hotel.update({
      where: { id: hotelId },
      data: updateData,
    });

    revalidatePath('/admin/hotels');

    return {
      success: true,
      message: 'Hotel updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

//Delete a hotel
export async function deleteHotel(id: string) {
    try {
      const hotelId = typeof id === 'string' ? Number(id) : id;
      await prisma.hotel.delete({ where: { id: hotelId } });

      revalidatePath('/admin/hotels');
      return {
        success: true,
        message: 'Hotel deleted successfully',
      };
    } catch (error) {
      return { success: false, message: formatError(error) };
    }
}

// Get single hotel by it's ID
export async function getHotelById(hotelId: string) {
  const id = typeof hotelId === 'string' ? Number(hotelId) : hotelId;
  const data = await prisma.hotel.findFirst({
    where: { id },
  });

  return convertToPlainObject(data);
}

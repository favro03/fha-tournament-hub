'use server';
import { prisma } from '../../db/prisma';
import { convertToPlainObject } from '../utils';

//Get All Hotels
export async function getHotels() {
    const data = await prisma.hotel.findMany();
    return convertToPlainObject(data);
}
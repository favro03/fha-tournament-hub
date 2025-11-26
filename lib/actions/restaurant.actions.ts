'use server';
import { prisma } from '../../db/prisma';
import { convertToPlainObject } from '../utils';

//Get All Restaurants
export async function getRestaurants() {
    const data = await prisma.restaurant.findMany();
    return convertToPlainObject(data);
}
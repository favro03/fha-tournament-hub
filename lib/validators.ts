import {z} from 'zod';

//Schema for inserting hotels
export const insertHotelSchema = z.object({
    name: z.string().min(3, "Hotel name is required"),
    address: z.string().min(10, "Valid address is required"),
    phone: z.string().min(7, "Valid phone number is required"),
    image: z.string().min(1, 'Hotel must have an image'),
    website: z.string().min(3,"Website must be a valid URL").optional(),
})

export const insertRestaurantSchema = z.object({
    name: z.string().min(3, "Restaurant name is required"),
    description: z.string().min(3, "Description is required"),
    address: z.string().min(3, "Valid address is required"),
    image: z.string().min(1, 'Restaurant must have an image'),
    website: z.string().min(3,"Website must be a valid URL").optional(),
})

//Schema for siging users in
export const signInFormSchema = z.object({
    username: z.string().min(3, "Username is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
})
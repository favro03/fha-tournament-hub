import {z} from 'zod';
import { insertHotelSchema } from '@/lib/validators';
import { insertRestaurantSchema } from '@/lib/validators';
import { insertBracketSchema } from '@/lib/validators';



export type Hotel = z.infer<typeof insertHotelSchema> & {
    id: number;
}
export type Restaurant = z.infer<typeof insertRestaurantSchema> & {
    id: number;
}
export type Bracket = z.infer<typeof insertBracketSchema> & {
    id: number;
}
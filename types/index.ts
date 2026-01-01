import {z} from 'zod';
import { insertHotelSchema } from '@/lib/validators';
import { insertRestaurantSchema } from '@/lib/validators';
import { insertBracketSchema, gameSchema } from '@/lib/validators';
export type Game = z.infer<typeof gameSchema>;



export type Hotel = z.infer<typeof insertHotelSchema> & {
    id: number;
}
export type Restaurant = z.infer<typeof insertRestaurantSchema> & {
    id: number;
}
export type Bracket = z.infer<typeof insertBracketSchema> & {
    id: number;
    games: Game[];
}
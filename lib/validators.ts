import {z} from 'zod';
// Schema for a team
export const teamSchema = z.object({
    id: z.number().int().optional(),
    teamName: z.string().min(1, 'Team name is required'),
    bracketId: z.number().int().optional(),
});
//Schema for adding game times
export const timeSchema = z.object({
    id: z.number().int().optional(),
    day: z.string().optional(),
    date: z.string().optional(),
    timeSlots: z.string().optional(),
    location: z.string().optional(),
   gameType: z.string().optional(),
    type: z.string().optional(),
});

//Schema for inserting hotels
export const insertHotelSchema = z.object({
    name: z.string().min(3, "Hotel name is required"),
    address: z.string().min(10, "Valid address is required"),
    phone: z.string().min(7, "Valid phone number is required"),
    image: z.string().min(1, 'Hotel must have an image'),
    website: z.string().min(3,"Website must be a valid URL").optional(),
})
//Schema for updating hotels
export const updateHotelSchema = insertHotelSchema;

//Schema for inserting restaurants
export const insertRestaurantSchema = z.object({
    name: z.string().min(3, "Restaurant name is required"),
    description: z.string().min(3, "Description is required"),
    address: z.string().min(3, "Valid address is required"),
    image: z.string().min(1, 'Restaurant must have an image'),
    website: z.string().min(3,"Website must be a valid URL").optional(),
})

//Schema for updating restaurants
export const updateRestaurantSchema = insertRestaurantSchema;

//Schema for siging users in
export const signInFormSchema = z.object({
    username: z.string().min(3, "Username is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
})

// Schema for inserting/updating a game
export const gameSchema = z.object({
    id: z.number().int().optional(),
    day: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    location: z.string().optional(),
    homeTeam: z.string().optional(),
    awayTeam: z.string().optional(),
    homeScore: z.number().int().optional(),
    awayScore: z.number().int().optional(),
    label: z.string().optional(), // For pool play (e.g., Consolation, 3rd Place, etc.)
});

// Schema for inserting bracket with games (only name required)
export const insertBracketSchema = z.object({
    name: z.string().min(3, "Tournament name is required"),
    youthLevel: z.string().optional(),
    date: z.string().optional(),
    image: z.string().optional(),
    games: z.array(gameSchema).optional(),
    teams: z.array(teamSchema).optional(),
    times: z.array(timeSchema).optional(),
});

// Schema for updating bracket
export const updateBracketSchema = insertBracketSchema;







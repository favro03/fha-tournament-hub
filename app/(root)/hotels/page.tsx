import { HotelCard } from '@/components/hotel-card';
import { getHotels } from '@/lib/actions/hotel.actions';
import { Hotel } from '@prisma/client';

const Hotels = async () => {
    const hotels = await getHotels();
    return ( 
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-center mb-8 text-white">
                Local Hotels
            </h1>
            
            <div className="flex justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
                    {hotels.map((hotel: Hotel) => (
                        <HotelCard 
                            key={hotel.id} 
                            hotel={hotel} 
                        />
                    ))}
                </div>
            </div>
        </div>
     );
}
 
export default Hotels;
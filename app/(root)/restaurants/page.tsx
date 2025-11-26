import { RestaurantCard } from '@/components/restaurant-card';
import { getRestaurants } from '@/lib/actions/restaurant.actions';

const Restaurants = async () => {
    const restaurants = await getRestaurants();

    return ( 
        <div className="container mx-auto px-4 py-8 text-white">
            <h1 className="text-3xl font-bold text-center mb-8">
                Local Restaurants
            </h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {restaurants.map((restaurant) => (
                    <RestaurantCard 
                        key={restaurant.id} 
                        restaurant={restaurant}
                    />
                ))}
            </div>
        </div>
     );
}
 
export default Restaurants;
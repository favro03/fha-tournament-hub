'use client';

import { Card } from '@/components/ui/card';
import { MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Restaurant } from '@/types';



export function RestaurantCard({ restaurant }: {restaurant: Restaurant}) {


  const handleLocationClick = () => {
    const encodedAddress = encodeURIComponent(restaurant.address);
    const mapsUrl = `https://maps.apple.com/?q=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  const handleWebsiteClick = () => {
    if (restaurant.website) {
      window.open(restaurant.website, '_blank');
    }
  };

  return (
    <Card className="relative aspect-square overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg bg-gray-300">
      {/* Background Image with filter effects instead of overlay */}
      <div className="absolute inset-0">
        <Image
          src={restaurant.image}
          alt={restaurant.name}
          width={400}
          height={400}
          className="w-full h-full object-cover transition-all duration-300 brightness-75 contrast-75 grayscale-[0.3] group-hover:brightness-100 group-hover:contrast-100 group-hover:grayscale-0"
          priority={false}
        />
      </div>
      
      {/* No overlay needed - using image filters instead */}
      
      {/* Content */}
      <div className="relative h-full flex flex-col justify-center items-center p-4 z-10">
        {/* Center - Restaurant Name */}
        <div className="text-center mb-4 group-hover:opacity-0 transition-opacity duration-300 bg-black/60 px-2 py-1 rounded text-white">
          <h3 className="text-lg md:text-xl font-bold drop-shadow-lg">
            {restaurant.name}
           
          </h3>
          <p className="drop-shadow-lg mt-1">{restaurant.description}</p>
        </div>
        
        {/* Icons below the name, side by side */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-black/20 group-hover:bg-blue-500 text-white border border-white/20 group-hover:border-blue-400 transition-all duration-200"
            onClick={handleLocationClick}
            aria-label={`View ${restaurant.name} location on map`}
          >
            <MapPin size={20} />
          </Button>
          
          {restaurant.website && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/20 group-hover:bg-green-500 text-white border border-white/20 group-hover:border-green-400 transition-all duration-200"
              onClick={handleWebsiteClick}
              aria-label={`Visit ${restaurant.name} website`}
            >
              <Store size={20} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
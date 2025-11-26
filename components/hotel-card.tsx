'use client';

import { Card } from '@/components/ui/card';
import { MapPin, Globe, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Hotel } from '@/types';



export function HotelCard({ hotel }: {hotel: Hotel}) {
  const handleLocationClick = () => {
    const encodedAddress = encodeURIComponent(hotel.address);
    const mapsUrl = `https://maps.apple.com/?q=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  const handleWebsiteClick = () => {
    if (hotel.website) {
      window.open(hotel.website, '_blank');
    }
  };

  const handlePhoneClick = () => {
    window.open(`tel:${hotel.phone}`, '_self');
  };

  return (
    <Card className="relative aspect-square overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg">
      {/* Background Image with filter effects instead of overlay */}
      <div className="absolute inset-0">
        <Image
          src={hotel.image}
          alt={hotel.name}
          width={400}
          height={400}
          className="w-full h-full object-cover transition-all duration-300 brightness-60 contrast-60 grayscale-[0.5] group-hover:brightness-100 group-hover:contrast-100 group-hover:grayscale-0"
          priority={false}
        />
      </div>
      
      {/* Content */}
      <div className="relative h-full flex flex-col justify-end items-center p-4 z-10">
        {/* Hotel Name and Icons at bottom */}
        <div className="text-center">
          <h3 className="text-white text-lg md:text-xl font-bold drop-shadow-lg group-hover:text-shadow-none transition-all duration-300 mb-4">
            {hotel.name}
          </h3>
          
          {/* Icons below the name, side by side */}
          <div className="flex gap-3 justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/20 group-hover:bg-blue-500 text-white border border-white/20 group-hover:border-blue-400 transition-all duration-200"
              onClick={handleLocationClick}
              aria-label={`View ${hotel.name} location on map`}
            >
              <MapPin size={20} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-black/20 group-hover:bg-purple-500 text-white border border-white/20 group-hover:border-purple-400 transition-all duration-200"
              onClick={handlePhoneClick}
              aria-label={`Call ${hotel.name}`}
            >
              <Phone size={20} />
            </Button>
            
            {hotel.website && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 bg-black/20 group-hover:bg-green-500 text-white border border-white/20 group-hover:border-green-400 transition-all duration-200"
                onClick={handleWebsiteClick}
                aria-label={`Visit ${hotel.name} website`}
              >
                <Globe size={20} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
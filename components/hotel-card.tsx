"use client";

import { Card } from "@/components/ui/card";
import { MapPin, Globe, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Hotel } from "@/types";

export function HotelCard({ hotel }: { hotel: Hotel }) {
  const handleLocationClick = () => {
    const encodedAddress = encodeURIComponent(hotel.address);
    const mapsUrl = `https://maps.apple.com/?q=${encodedAddress}`;
    window.open(mapsUrl, "_blank");
  };

  const handleWebsiteClick = () => {
    if (hotel.website) {
      window.open(hotel.website, "_blank");
    }
  };

  const handlePhoneClick = () => {
    window.open(`tel:${hotel.phone}`, "_self");
  };

  return (
    <Card className="group relative overflow-hidden rounded-[28px] border border-emerald-400/15 bg-slate-950/70 shadow-2xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-slate-900/85">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_45%)]" />

      <div className="relative aspect-[4/4] overflow-hidden">
        <Image
          src={hotel.image}
          alt={hotel.name}
          width={600}
          height={600}
          className="h-full w-full object-cover transition-all duration-500 brightness-50 contrast-90 saturate-75 group-hover:scale-105 group-hover:brightness-75 group-hover:saturate-100"
          priority={false}
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05)_0%,rgba(2,6,23,0.28)_45%,rgba(2,6,23,0.9)_100%)]" />
      </div>

      <div className="relative -mt-24 flex min-h-[170px] flex-col justify-end p-5">
        <div className="rounded-[24px] border border-emerald-400/15 bg-slate-950/70 p-4 backdrop-blur-md">
          <h3 className="text-center text-xl font-bold text-white drop-shadow-sm">
            {hotel.name}
          </h3>

          {hotel.address ? (
            <p className="mt-2 line-clamp-2 text-center text-sm text-slate-300">
              {hotel.address}
            </p>
          ) : null}

          <div className="mt-4 flex justify-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-xl border border-emerald-400/20 bg-emerald-500/12 text-emerald-300 transition-all duration-200 hover:bg-emerald-500/22 hover:text-white"
              onClick={handleLocationClick}
              aria-label={`View ${hotel.name} location on map`}
            >
              <MapPin size={20} />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-xl border border-emerald-400/20 bg-emerald-500/12 text-emerald-300 transition-all duration-200 hover:bg-emerald-500/22 hover:text-white"
              onClick={handlePhoneClick}
              aria-label={`Call ${hotel.name}`}
            >
              <Phone size={20} />
            </Button>

            {hotel.website && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl border border-emerald-400/20 bg-emerald-500/12 text-emerald-300 transition-all duration-200 hover:bg-emerald-500/22 hover:text-white"
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
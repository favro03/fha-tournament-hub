import { HotelCard } from "@/components/hotel-card";
import { getHotels } from "@/lib/actions/hotel.actions";
import { Hotel } from "@prisma/client";
import { Building2 } from "lucide-react";

const Hotels = async () => {
  const hotels = await getHotels();

  return (
    <div className="min-h-screen bg-[url('/images/rinkWlights.png')] bg-cover bg-center bg-fixed">
      <div className="min-h-screen bg-[linear-gradient(180deg,rgba(3,18,12,0.58)_0%,rgba(6,28,18,0.72)_38%,rgba(2,10,8,0.88)_100%)]">
        <div className="container mx-auto px-4 py-8 lg:px-6 lg:py-10">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[32px] border border-emerald-400/20 bg-[rgba(6,29,22,0.52)] p-5 shadow-2xl backdrop-blur-sm lg:p-8">
              <div className="mb-8 flex flex-col gap-3 text-center lg:mb-10">
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/20">
                  <Building2 className="h-7 w-7" />
                </div>

                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                  FHA Tournament Hub
                </div>

                <h1 className="text-3xl font-bold text-white lg:text-5xl">
                  Local Hotels
                </h1>

                <p className="mx-auto max-w-3xl text-sm text-slate-200 lg:text-base">
                  Find nearby hotel options for tournament weekends in Faribault.
                </p>
              </div>

              {hotels.length === 0 ? (
                <div className="rounded-[28px] border border-emerald-400/15 bg-[rgba(8,35,27,0.72)] p-8 text-center text-white shadow-xl backdrop-blur-md">
                  <h2 className="text-xl font-semibold">No hotels available</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Hotel listings have not been added yet.
                  </p>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {hotels.map((hotel: Hotel) => (
                      <HotelCard key={hotel.id} hotel={hotel} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hotels;
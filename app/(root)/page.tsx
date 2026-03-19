import Link from "next/link";
import {
  ChevronRight,
  Hotel,
  Trophy,
  UtensilsCrossed,
  ScrollText,
  BarChart3,
} from "lucide-react";
import HomepageTicker from "@/components/home/homepage-ticker";

export const revalidate = 60;

type HomeCardProps = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
};

function HomeCard({
  href,
  title,
  description,
  icon,
  className = "",
}: HomeCardProps) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-[28px] border border-white/12 bg-slate-950/70 p-6 text-white shadow-2xl backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-slate-900/80 ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-emerald-300 ring-1 ring-white/10">
          {icon}
        </div>

       
        <h2 className="mt-2 text-2xl font-bold leading-tight">{title}</h2>
        <p className="mt-3 max-w-sm text-sm text-slate-200">{description}</p>

        <div className="mt-auto pt-6">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
            Open
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Homepage() {
  return (
    <div className="min-h-screen bg-[url('/images/rinkWlights.png')] bg-cover bg-center bg-fixed">
      <div className="min-h-screen bg-[linear-gradient(180deg,rgba(3,18,12,0.58)_0%,rgba(6,28,18,0.72)_38%,rgba(2,10,8,0.88)_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          <HomepageTicker />

          <div className="mt-6 rounded-[32px] border border-emerald-400/20 bg-[rgba(6,29,22,0.52)] p-5 shadow-2xl backdrop-blur-sm lg:p-8">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
             
                <h1 className="mt-2 text-3xl font-bold text-white lg:text-4xl">
                  See what’s happening in the tournament right now.
                </h1>
                <p className="mt-3 max-w-4xl text-sm text-slate-200 lg:text-base">
                  Check the current bracket, view live standings, see upcoming games,
                  and find the tournament details you need.
                </p>
              </div>
            </div>

            <div className="grid auto-rows-[minmax(220px,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-4">
              <HomeCard
                href="/brackets"
                title="Brackets"
                description="See tournament schedules, pool play, placement games, and live results."
                icon={<Trophy className="h-7 w-7" />}
                className="xl:col-span-2"
              />

              <HomeCard
                href="/standings"
                title="Current Standings"
                description="Jump straight to the active tournament standings without opening the full bracket first."
                icon={<BarChart3 className="h-7 w-7" />}
              />

              <HomeCard
                href="/rules"
                title="Tournament Rules"
                description="Review tournament rules, structure, and key event information."
                icon={<ScrollText className="h-7 w-7" />}
              />

              <HomeCard
                href="/hotels"
                title="Hotels"
                description="Find lodging options for traveling teams and families."
                icon={<Hotel className="h-7 w-7" />}
              />

              <HomeCard
                href="/restaurants"
                title="Food & Restaurants"
                description="Quick access to nearby places to eat between games."
                icon={<UtensilsCrossed className="h-7 w-7" />}
                className="md:col-span-2 xl:col-span-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
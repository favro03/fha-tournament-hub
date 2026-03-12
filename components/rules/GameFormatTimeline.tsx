// /components/rules/GameFormatTimeline.tsx
import { Clock, AlertCircle, Timer, Trophy, Zap, Target } from "lucide-react";

interface GameFormatTimelineProps {
  items: string[];
}

export default function GameFormatTimeline({ items }: GameFormatTimelineProps) {
  const getIcon = (index: number) => {
    const icons = [Clock, AlertCircle, Timer, Trophy, Zap, Target];
    const IconComponent = icons[index % icons.length];
    return <IconComponent className="h-6 w-6 text-emerald-300" />;
  };

  return (
    <div className="space-y-8">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 text-emerald-300">
          <Trophy className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.22em]">
            Tournament Format
          </span>
        </div>

        <h2 className="mt-4 text-3xl font-bold text-white">Game Format</h2>
        <p className="mt-3 text-base text-slate-200">
          Follow the timeline for a smooth tournament experience
        </p>
      </div>

      <div className="relative">
        <div className="absolute bottom-0 left-6 top-0 w-px bg-emerald-400/20" />

        <div className="space-y-6">
          {items.map((item, index) => (
            <div key={index} className="relative flex items-start gap-5">
              <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-[rgba(10,40,30,0.95)] shadow-lg">
                {getIcon(index)}
              </div>

              <div className="flex-1 rounded-[24px] border border-emerald-400/15 bg-[rgba(14,55,40,0.65)] p-5 shadow-xl backdrop-blur-md transition duration-300 hover:border-emerald-400/25 hover:bg-[rgba(18,65,47,0.72)]">
                <div className="text-base leading-relaxed text-slate-100">
                  {item}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
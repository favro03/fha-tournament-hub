import { Metadata } from "next";
import { tournamentRules } from "@/data/tournamentRules";
import GameFormatTimeline from "@/components/rules/GameFormatTimeline";
import PenaltyCard from "@/components/rules/PenaltyCard";
import RulesAccordion from "@/components/rules/RulesAccordion";
import SectionList from "@/components/rules/SectionList";
import { Accordion } from "@/components/ui/accordion";
import { BookOpen, Trophy } from "lucide-react";

export const metadata: Metadata = {
  title: "Tournament Rules | FHA Tournament Hub",
  description:
    "Complete tournament rules and guidelines for the Faribault Hockey Association Tournament Hub.",
};

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-[url('/images/rinkWlights.png')] bg-cover bg-center bg-fixed">
      <div className="min-h-screen bg-[linear-gradient(180deg,rgba(3,18,12,0.58)_0%,rgba(6,28,18,0.72)_38%,rgba(2,10,8,0.88)_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
          <div className="rounded-[32px] border border-emerald-400/20 bg-[rgba(6,29,22,0.52)] p-5 shadow-2xl backdrop-blur-sm lg:p-8">
            {/* Hero Section */}
            <div className="mb-12 text-center">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/20">
                <BookOpen className="h-7 w-7" />
              </div>

              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                FHA Tournament Hub
              </div>

              <h1 className="mt-3 text-3xl font-bold text-white lg:text-5xl">
                Tournament Rules
              </h1>

              <p className="mx-auto mt-4 max-w-3xl text-sm text-slate-200 lg:text-base">
                Everything you need to know for a successful tournament experience.
                From game formats to penalties, we&apos;ve got you covered.
              </p>

              <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-emerald-400/80" />
            </div>

            {/* Game Format Timeline */}
            <section className="mb-16 rounded-[28px] border border-emerald-400/20 bg-[rgba(12,45,34,0.65)] p-6 shadow-xl backdrop-blur-md lg:p-8">
              <div
                className="
                  [&_.text-foreground]:!text-slate-100
                  [&_.text-secondary]:!text-slate-200
                  [&_.text-muted-foreground]:!text-slate-300
                  [&_.text-primary]:!text-emerald-300
                  [&_.bg-card]:!bg-[rgba(14,55,40,0.65)]
                  [&_.bg-background]:!bg-transparent
                  [&_.border]:!border-emerald-400/20
                  [&_.shadow-md]:!shadow-none
                  [&_.shadow-lg]:!shadow-none
                  [&_h1]:!text-white
                  [&_h2]:!text-white
                  [&_h3]:!text-white
                  [&_p]:!text-slate-100
                  [&_span]:!text-inherit
                  [&_[class*='bg-white']]:!bg-[rgba(14,55,40,0.65)]
                  [&_[class*='text-black']]:!text-slate-100
                  [&_[class*='text-gray-']]:!text-slate-200
                  [&_[class*='text-slate-']]:!text-slate-100
                "
              >
                <GameFormatTimeline items={tournamentRules["Game Format"]} />
              </div>
            </section>

            {/* Penalties Section */}
            <section className="mb-16">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-white lg:text-3xl">
                  Penalty Overview
                </h2>
                <p className="mt-2 text-sm text-slate-300 lg:text-base">
                  Understanding the different types of penalties and their consequences.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournamentRules.Penalties.map((penalty, index) => (
                  <PenaltyCard key={index} penalty={penalty} />
                ))}
              </div>
            </section>

            {/* Did You Know Callout */}
            <section className="mb-16">
              <div className="rounded-[28px] border border-emerald-400/15 bg-[rgba(8,35,27,0.72)] p-8 shadow-xl backdrop-blur-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
                  <h3 className="text-xl font-bold text-emerald-300">
                    Did You Know?
                  </h3>
                </div>
                <p className="text-base leading-relaxed text-slate-100 lg:text-lg">
                  Teams should arrive 15 minutes early as games may begin ahead of
                  schedule to maximize ice time. This helps ensure the tournament runs
                  smoothly for everyone.
                </p>
              </div>
            </section>

            {/* Other Rules Sections */}
            <section>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-white lg:text-3xl">
                  Additional Rules &amp; Guidelines
                </h2>
                <p className="mt-2 text-sm text-slate-300 lg:text-base">
                  Expand each section to learn more about specific tournament
                  requirements.
                </p>
              </div>

              <Accordion type="multiple" className="space-y-6">
                <RulesAccordion title="Tournament Logistics" value="logistics">
                  <SectionList items={tournamentRules["Tournament Logistics"]} />
                </RulesAccordion>

                <RulesAccordion title="Team and Player Guidelines" value="guidelines">
                  <SectionList items={tournamentRules["Team and Player Guidelines"]} />
                </RulesAccordion>
              </Accordion>
            </section>

            {/* Footer Call to Action */}
            <section className="mt-16 text-center">
              <div className="rounded-[28px] border border-emerald-400/15 bg-[rgba(8,35,27,0.72)] p-8 shadow-xl backdrop-blur-md">
                <h3 className="text-2xl font-bold text-white">Ready to Play?</h3>
                <p className="mt-3 text-slate-300">
                  Make sure your team understands all the rules before hitting the ice.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 font-semibold text-emerald-300">
                  <Trophy className="h-5 w-5" />
                  <span>Good luck and play fair!</span>
                  <Trophy className="h-5 w-5" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
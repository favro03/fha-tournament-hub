// /app/(root)/rules/page.tsx
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
  description: "Complete tournament rules and guidelines for the Faribault Hockey Association Tournament Hub.",
};

export default function RulesPage() {
  return (
    <div className="wrapper">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className="w-8 h-8 text-secondary" />
          <h1 className="h1-bold text-secondary">Tournament Rules</h1>
          <BookOpen className="w-8 h-8 text-secondary" />
        </div>
        <p className="text-xl text-secondary max-w-3xl mx-auto">
          Everything you need to know for a successful tournament experience. 
          From game formats to penalties, we&apos;ve got you covered!
        </p>
        <div className="mt-6 h-1 w-24 bg-primary mx-auto rounded-full"></div>
      </div>

      {/* Game Format Timeline */}
      <section className="mb-16">
        <GameFormatTimeline items={tournamentRules["Game Format"]} />
      </section>

      {/* Penalties Section */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="h2-bold text-secondary mb-2">Penalty Overview</h2>
          <p className="text-secondary">Understanding the different types of penalties and their consequences</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournamentRules.Penalties.map((penalty, index) => (
            <PenaltyCard key={index} penalty={penalty} />
          ))}
        </div>
      </section>

      {/* Did You Know Callout */}
      <section className="mb-16">
        <div className="bg-card rounded-xl p-8 border border-primary/20 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
            <h3 className="h3-bold text-primary">Did You Know?</h3>
          </div>
          <p className="text-lg text-foreground leading-relaxed">
            Teams should arrive 15 minutes early as games may begin ahead of schedule to maximize ice time. 
            This helps ensure the tournament runs smoothly for everyone!
          </p>
        </div>
      </section>

      {/* Other Rules Sections */}
      <section>
        <div className="text-center mb-8">
          <h2 className="h2-bold text-secondary mb-2">Additional Rules & Guidelines</h2>
          <p className="text-secondary">Expand each section to learn more about specific tournament requirements</p>
        </div>

        <Accordion type="multiple" className="space-y-6">
          <RulesAccordion 
            title="Tournament Logistics" 
            value="logistics"
          >
            <SectionList items={tournamentRules["Tournament Logistics"]} />
          </RulesAccordion>

          <RulesAccordion 
            title="Team and Player Guidelines" 
            value="guidelines"
          >
            <SectionList items={tournamentRules["Team and Player Guidelines"]} />
          </RulesAccordion>
        </Accordion>
      </section>

      {/* Footer Call to Action */}
      <section className="mt-16 text-center">
        <div className="bg-card rounded-xl p-8 border shadow-lg">
          <h3 className="h3-bold mb-4">Ready to Play?</h3>
          <p className="text-muted-foreground mb-6">
            Make sure your team understands all the rules before hitting the ice!
          </p>
          <div className="flex items-center justify-center gap-2 text-primary font-semibold">
            <Trophy className="w-5 h-5" />
            <span>Good luck and play fair!</span>
            <Trophy className="w-5 h-5" />
          </div>
        </div>
      </section>
    </div>
  );
}
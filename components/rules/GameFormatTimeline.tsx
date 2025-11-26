// /components/rules/GameFormatTimeline.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertCircle, Timer, Trophy, Zap, Target } from "lucide-react";

interface GameFormatTimelineProps {
  items: string[];
}

export default function GameFormatTimeline({ items }: GameFormatTimelineProps) {
  const getIcon = (index: number) => {
    const icons = [Clock, AlertCircle, Timer, Trophy, Zap, Target];
    const IconComponent = icons[index % icons.length];
    return <IconComponent className="w-6 h-6 text-primary" />;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="h2-bold text-secondary mb-2">Game Format</h2>
        <p className="text-secondary">Follow the timeline for a smooth tournament experience</p>
      </div>
      
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-primary/30"></div>
        
        <div className="space-y-6">
          {items.map((item, index) => (
            <div key={index} className="relative flex items-start gap-4">
              {/* Timeline marker */}
              <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-background border-4 border-primary rounded-full">
                {getIcon(index)}
              </div>
              
              {/* Content card */}
              <Card className="flex-1 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="text-foreground leading-relaxed">
                    {item}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
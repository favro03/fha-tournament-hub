// /components/rules/PenaltyCard.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Ban, Flame } from "lucide-react";

interface PenaltyCardProps {
  penalty: string;
}

export default function PenaltyCard({ penalty }: PenaltyCardProps) {
  const getPenaltyType = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('minor')) return 'minor';
    if (lowerText.includes('major')) return 'major';
    if (lowerText.includes('misconduct') || lowerText.includes('fighting')) return 'severe';
    return 'general';
  };

  const getCardStyles = (type: string) => {
    switch (type) {
      case 'minor':
        return {
          cardClass: 'bg-yellow-50 border-yellow-400 border-2 hover:shadow-yellow-200',
          headerClass: 'bg-yellow-200 text-yellow-900',
          icon: AlertTriangle,
          label: 'Minor Penalty'
        };
      case 'major':
        return {
          cardClass: 'bg-red-50 border-red-500 border-2 hover:shadow-red-200',
          headerClass: 'bg-red-200 text-red-900',
          icon: AlertCircle,
          label: 'Major Penalty'
        };
      case 'severe':
        return {
          cardClass: 'bg-black text-white border-gray-700 border-2 hover:shadow-gray-400',
          headerClass: 'bg-gray-800 text-white',
          icon: Ban,
          label: 'Misconduct'
        };
      default:
        return {
          cardClass: 'bg-blue-50 border-blue-400 border-2 hover:shadow-blue-200',
          headerClass: 'bg-blue-200 text-blue-900',
          icon: Flame,
          label: 'General Rule'
        };
    }
  };

  const penaltyType = getPenaltyType(penalty);
  const styles = getCardStyles(penaltyType);
  const IconComponent = styles.icon;

  return (
    <Card className={`${styles.cardClass} transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1`}>
      <CardHeader className={`${styles.headerClass} py-3 px-4 rounded-t-lg`}>
        <div className="flex items-center gap-2">
          <IconComponent className="w-5 h-5" />
          <span className="font-semibold text-sm">{styles.label}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <p className={`text-sm leading-relaxed ${penaltyType === 'severe' ? 'text-white' : 'text-gray-700'}`}>
          {penalty}
        </p>
      </CardContent>
    </Card>
  );
}
// /components/rules/SectionList.tsx
import { CheckCircle } from "lucide-react";

interface SectionListProps {
  items: string[];
}

export default function SectionList({ items }: SectionListProps) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border-l-4 border-primary">
          <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-foreground leading-relaxed">
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}
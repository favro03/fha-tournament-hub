// /components/rules/RulesAccordion.tsx
import { ReactNode } from "react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Disc3, AlertCircle } from "lucide-react";

interface RulesAccordionProps {
  title: string;
  children: ReactNode;
  value: string;
}

export default function RulesAccordion({ title, children, value }: RulesAccordionProps) {
  return (
    <AccordionItem value={value} className="border border-border rounded-lg px-6 py-2 bg-card">
      <AccordionTrigger className="hover:no-underline py-6">
        <div className="flex items-center gap-3">
          {title.toLowerCase().includes('penalty') ? (
            <AlertCircle className="w-5 h-5 text-primary" />
          ) : (
            <Disc3 className="w-5 h-5 text-primary" />
          )}
          <span className="text-lg font-semibold text-left">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-6">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
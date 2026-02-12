

// TypeScript declaration for window.bracketsViewer
declare global {
    interface Window {
        bracketsViewer?: {
            render: (options: any) => void;
        };
    }
}

import { BracketCard } from "@/components/bracket-card";
import { getBrackets } from "@/lib/actions/brackets.actions";
import BracketViewer from "@/components/BracketViewer";

const Brackets = async () => {
    const brackets = await getBrackets();

    // Map brackets directly, no games/times logic needed
    const safeBrackets = Array.isArray(brackets)
        ? brackets.map(bracket => ({ ...bracket }))
        : [];

    return (
        <div>
            {safeBrackets.map((bracket: any) => (
                <div key={bracket.id}>
                    <BracketCard bracket={bracket} />
                    <BracketViewer bracketId={bracket.id} />
                </div>
            ))}
        </div>
    );
};

export default Brackets;



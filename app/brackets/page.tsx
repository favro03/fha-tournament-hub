import { BracketCard } from "@/components/bracket-card";
import { getBrackets } from "@/lib/actions/brackets.actions";

const Brackets = async () => {
    const brackets = await getBrackets();

    // Ensure each bracket has games array and label is never null
    const safeBrackets = Array.isArray(brackets)
        ? brackets.map(bracket => ({
            ...bracket,
            games: Array.isArray(bracket.games)
                ? bracket.games.map(g => ({
                    ...g,
                    label: g.label === null ? undefined : g.label
                }))
                : [],
        }))
        : [];

    return ( 
        <div>
            {safeBrackets.map((bracket) => (
                <BracketCard 
                    key={bracket.id} 
                    bracket={bracket}
                />
            ))}
        </div>
    );
}
 
export default Brackets;
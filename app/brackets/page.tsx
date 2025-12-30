import { BracketCard } from "@/components/bracket-card";
import { getBrackets } from "@/lib/actions/brackets.actions";

const Brackets = async () => {
    const brackets = await getBrackets();

    return ( 
     
           
            <div >
                {brackets.map((bracket) => (
                    <BracketCard 
                        key={bracket.id} 
                        bracket={bracket}
                    />
                ))}
            </div>
     
     );
}
 
export default Brackets;
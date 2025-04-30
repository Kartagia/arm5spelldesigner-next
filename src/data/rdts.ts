
import { Range, Duration, Target, RDT } from "@/lib/modifiers"

/**
 * The source of RDTS.
 */

export async function getAllRDTs() {

    return [
        ...["Personal", ["Touch", "Eye"], "Voice", "Sight", "Arcane Connection"].flatMap(
            (range, index) => ((Array.isArray(range) ? range : [range]).map((rdt) => Range(rdt, index))
            )),
        ...["Momentary", ["Concentration", "Diameter"], "Sun", "Moon", "Year"].flatMap(
            (range, index) => ((Array.isArray(range) ? range : [range]).map((rdt) => Duration(rdt, index))
            )),
            ...["Individual", "Part", ["Group", "Room"], "Structure", "Boundary"].flatMap(
                (range, index) => ((Array.isArray(range) ? range : [range]).map((rdt) => Target(rdt, index))
                )),
        
    ];

}
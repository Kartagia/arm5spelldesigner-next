
import { createApiConnection } from "@/lib/db";
import { Range, Duration, Target, RDT, createUUID } from "@/lib/modifiers"
import { randomUUID, UUID } from "crypto";



type RdtStorage<TYPE extends string=string, KEY extends TYPE=TYPE> = {
    [key in KEY]: RDT<key>[];
}

const rdts = {
    Range: [] as RDT<"Range">[],
    Duration: [] as RDT<"Duration">[],
    Target:[] as RDT<"Target">[]
} as RdtStorage<string>;

let baseId = 1;
rdts.Range = ["Personal", ["Touch", "Eye"], "Voice", "Sight", "Arcane Connection"].flatMap(
            (range, index) => ((Array.isArray(range) ? range : [range]).map((rdt) => Range(rdt, index, undefined, createUUID(baseId++)))
            ));
rdts.Duration =  ["Momentary", ["Concentration", "Diameter"], "Sun", "Moon", "Year"].flatMap(
    (range, index) => ((Array.isArray(range) ? range : [range]).map((rdt) => Duration(rdt, index, undefined, createUUID(baseId++)))
    ));
rdts.Target = ["Individual", "Part", ["Group", "Room"], "Structure", "Boundary"].flatMap(
    (range, index) => ((Array.isArray(range) ? range : [range]).map((rdt) => Target(rdt, index, undefined, createUUID(baseId++)))
    ));

/**
 * The source of RDTS.
 */
export async function getAllRDTs() {

    return Object.getOwnPropertyNames(rdts).flatMap( (type) => (rdts[type]));

}

console.log("RDTS: ", (await getAllRDTs().then( (all) => (all.map( rdt => (`${rdt.type}:${rdt.name}${rdt.modifier}`))))).join(", "));

export async function createRDT<TYPE extends string>(rdt: RDT<TYPE>): Promise<UUID> {
    if (!(rdt.type in rdts)) {
        rdts[rdt.type] = [];
    }
    const uuid = randomUUID();

    // Checking if we are replacing an existing RDT.
    const index = rdts[rdt.type].findIndex( (cursor) => (cursor.name === rdt.name && cursor.modifier === rdt.modifier));
    if (index >= 0) {
        // The element exists. 
        rdts[rdt.type].splice(index, 1, {...rdt, guid: uuid});
    } else {
        // Adding new element.
        rdts[rdt.type].push({...rdt, guid: uuid});
    }
    return uuid;
}

export async function getDbRDTs() {
    return createApiConnection().then( (dbh) => {
        dbh.query<{ ranges: RDT<"range"|"duration"|"target">}>( {
            text: "SELECT * FROM apiq",
            values: [],
        
        })  
    });
}
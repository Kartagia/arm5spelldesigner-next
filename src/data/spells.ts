

/**
 * THe spells data source.
 */

import SpellsPage from "@/app/(logged)/spells/page";
import { checkUUID, RDT, validUUID } from "@/lib/modifiers";
import { SpellModel } from "@/lib/spells";
import { randomUUID, UUID } from "crypto";
import { generateId } from "lucia";
import { getAllRDTs } from "./rdts";

const allRdts = await getAllRDTs();

function getRdt<T extends string>(value: RDT<T>|undefined) {
    if (value) {
        return [value]
    } else {
        return [];
    }
}
function getRdtUUID<T extends string>(value: RDT<T>|undefined):UUID[] {
    if (value && validUUID(value.guid)) {
        return [checkUUID(value.guid)]
    } else {
        return [];
    }
}

var spellStore: SpellModel[] = [

    { name: "Rock of Viscid Clay", technique: "Mu", form: "Te", level: 15, 
        range: getRdt(allRdts.find( (rdt) => (rdt.type === "Range" && rdt.name === "Touch"))) as RDT<"Range">[],
        duration: getRdt(allRdts.find( (rdt) => (rdt.type === "Duration" && rdt.name === "Concentration"))) as RDT<"Duration">[], 
        target: getRdt(allRdts.find( (rdt) => (rdt.type === "Target" && rdt.name === "Part"))) as RDT<"Target">[],
        description: "Change the stone touched by the caster into clay allowing manipulating it"
    
    },
    { name: "Lampi without Flame", technique: "Cr", form: "Ig", level: 15, 
        range: getRdt(allRdts.find( (rdt) => (rdt.type === "Range" && rdt.name === "Touch"))) as RDT<"Range">[],
        duration: getRdt(allRdts.find( (rdt) => (rdt.type === "Duration" && rdt.name === "Concentration"))) as RDT<"Duration">[], 
        target: getRdt(allRdts.find( (rdt) => (rdt.type === "Target" && rdt.name === "Individual"))) as RDT<"Target">[],
        description: "Create a directionless light equal to lamplight."
    
    }

];

export async function getAllSpells(): Promise<SpellModel[]> {
    return [...spellStore];
}


var reservedUUIDs: UUID[] = [];

/**
 * Get an unique UUID. 
 */
async function getUUID() {
    let candidate = randomUUID();
    while (spellStore.find(spell => (spell.guid === candidate)) || reservedUUIDs.includes(candidate)) {
        candidate = randomUUID();
    }
    reservedUUIDs.push(candidate);
    return candidate;
}

export async function storeSpells(spells: SpellModel[], altered?: UUID[]) {

    if (altered) {
        // We need only to touch altered spells - and spells without GUID.
        spells.filter((spell) => (spell.guid === undefined || validUUID(spell?.guid) && altered.includes(checkUUID(spell?.guid)))).forEach(
            async (spell) => {
                if (validUUID(spell.guid)) {
                    const uuid = checkUUID(spell.guid);
                    const index = reservedUUIDs.indexOf(uuid);
                    if (index >= 0) {
                        // Remove guid from rerverd guids. 
                        reservedUUIDs.splice(index, 1);
                    }
                    spells.push(spell);
                } else {
                    const uuid = await getUUID();
                    spells.push({...spell, guid: uuid});
                    const rindex = reservedUUIDs.indexOf(uuid);
                    reservedUUIDs.splice(rindex, 1);
                }
            }
        );
    } else {
        // Changing all spells. 
        const oldReserved = reservedUUIDs;
        reservedUUIDs = [...oldReserved];
        spellStore = await Promise.all(spells.map(async (spell) => {
            if (validUUID(spell.guid)) {
                return spell;
            } else {
                const uuid = await getUUID();
                return { ...spell, guid: uuid };
            }
        }));
        reservedUUIDs = oldReserved;
    }

}
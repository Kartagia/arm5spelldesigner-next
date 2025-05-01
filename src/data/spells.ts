

/**
 * THe spells data source.
 */

import { checkUUID, RDT, validUUID } from "@/lib/modifiers";
import { checkSpell, getAllGuidelines, NewSpellModel, SpellLevel, SpellModel } from "@/lib/spells";
import { randomUUID, UUID } from "crypto";
import { getAllRDTs } from "./rdts";
import { resourceLimits } from "worker_threads";
import { getAllArts, getAllTechniques } from "./arts";

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

    { 
        guid: randomUUID(),
        name: "Rock of Viscid Clay", technique: "Mu", form: "Te", level: 15, 
        range: getRdt(allRdts.find( (rdt) => (rdt.type === "Range" && rdt.name === "Touch"))) as RDT<"Range">[],
        duration: getRdt(allRdts.find( (rdt) => (rdt.type === "Duration" && rdt.name === "Concentration"))) as RDT<"Duration">[], 
        target: getRdt(allRdts.find( (rdt) => (rdt.type === "Target" && rdt.name === "Part"))) as RDT<"Target">[],
        description: "Change the stone touched by the caster into clay allowing manipulating it"
    
    },
    { 
        guid: randomUUID(),
        name: "Lampi without Flame", technique: "Cr", form: "Ig", level: 15, 
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

/**
 * The api reference.
 */
export interface Reference<TYPE extends string|undefined = string|undefined> {
    /**
     * The referenced UUID.
     */
    guid: UUID;
    /**
     * The current date of the reference. This is in game date.
     */
    currentDate?: string;
    type: TYPE;
}

export interface ApiSpellModel {
    guid: UUID;

    name: string;
    range: UUID[];
    duration: UUID[];
    target: UUID[];
    level: SpellLevel;
    form: string|Reference<"art.form">;
    technique: string|Reference<"art.technique">;
    guideline?: UUID;
    traits?: string[];
}

export type NewApiSpellModel = Omit<ApiSpellModel, "guid">

export async function convertSpellToApi(spell: SpellModel|NewSpellModel): Promise<ApiSpellModel|NewApiSpellModel> {

    // Create RDTs for the RDTs not yet implemented.
    function createRdtIfNecessary<TYPE extends string>( rdts: RDT<TYPE>[]|undefined): RDT<TYPE>[] {
        return [ ...(rdts ?? [])].map( rdt => {
            if (!validUUID(rdt.guid)) {
                /**
                 * @todo Create a new rdt with rdt data source.
                 */
                const guid = randomUUID();
                return {...rdt, guid};
            } else {
                return rdt;
            }
        });
    };

    const result: ApiSpellModel|NewApiSpellModel = {
        name: spell.name,
        level: spell.level,
        guideline: spell.guideline ? checkUUID(spell.guideline): undefined,
        technique: spell.technique,
        form: spell.form,
        range: createRdtIfNecessary<"Range">(spell.range).map( rdt => (rdt.guid as UUID)),
        duration: createRdtIfNecessary<"Duration">(spell.duration).map( rdt => (rdt.guid as UUID)),
        target: createRdtIfNecessary<"Target">(spell.target).map( rdt => (rdt.guid as UUID)),
        traits: spell.traits
    };
    if ("guid" in spell && validUUID(spell.guid)) {
        // Not a new spell.
        return {
            ...result,
            guid: spell.guid as UUID
        }
    } else {
        return result;
    }
}

/**
 * API does not return new spell models. 
 * @param spellApi The converted API spell model. 
 */
export async function convertApiToSpell(spellApi: ApiSpellModel): Promise<SpellModel> {

    async function getArtKeyIfNeeded<TYPE extends string>(value: Reference<TYPE>|string, taskList?: Promise<any>[]): Promise<string> {
        if (typeof value === "string") {
            return value;
        } else if (taskList) {
            const result: Promise<string> = getAllArts().then( arts => (arts.find( art => (art.guid === value.guid))))
            .then( (res) => {if (res) { return res.abbrev; } else { throw "Not found"}});
            taskList.push(result);

            return result 
        } else {
            const result = (await getAllArts()).find( art => (art.guid === value.guid));
            if (result) {
                return result.abbrev;
            } else {
                throw "Not found";
            }
        }
    }
    const allRdts = await getAllRDTs();

    async function getRDTValue<TYPE extends string>(ids: UUID[], type: TYPE|TYPE[]): Promise<RDT<TYPE>[]> {
        return ids.reduce( (result: RDT<TYPE>[], uuid: string) => {
            const validTypes: string[] = Array.isArray(type) ? type : [type];
            const found = allRdts.find( (cursor) => (cursor.guid === uuid && (validTypes.includes(cursor.type.toString()))));
            if (found) {
                result.push(found as RDT<TYPE>);
                return result;
            } else {
                /**
                 * @todo Try to get the value from API. 
                 */
                throw new Error("RDT not found");
            }
        }, []);
    }

    const result : Partial<SpellModel> = {
        name: spellApi.name,
        level: spellApi.level,
        guideline: spellApi.guideline,
        traits: spellApi.traits,
        technique: await getArtKeyIfNeeded(spellApi.technique),
        form: await getArtKeyIfNeeded(spellApi.form),
        range: await getRDTValue<"Range">(spellApi.range, "Range"),
        duration: await getRDTValue<"Duration">(spellApi.range, "Duration"),
        target: await getRDTValue<"Target">(spellApi.range, "Target"),
    };
    return checkSpell(result);
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
                    console.log("Using UUID %s of the spell", spell.guid);
                    spells.push(spell);
                } else {
                    const uuid = await getUUID();
                    console.log("Adding spell with new uuid %s", uuid);
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
                console.log("Using UUID %s of the spell", spell.guid);
                return spell;
            } else {
                const uuid = await getUUID();
                console.log("Adding spell with new uuid %s", uuid);
                return { ...spell, guid: uuid };
            }
        }));
        reservedUUIDs = oldReserved;
    }

}
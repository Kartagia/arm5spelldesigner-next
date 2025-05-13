

/**
 * THe spells data source.
 */

import { checkUUID, RDT, UUIDSupplier, validUUID } from "@/lib/modifiers";
import { checkSpell, getAllGuidelines, NewSpellModel, SpellLevel, SpellModel } from "@/lib/spells";
import { randomUUID, UUID } from "crypto";
import { createRDT, getAllRDTs } from "./rdts";
import { resourceLimits } from "worker_threads";
import { getAllArts, getAllTechniques } from "./arts";
import { logger } from "@/lib/api_auth";
import { error } from "console";
import { createApiConnection } from "@/lib/db";
import { safeRelease } from "@/lib/api_db";

const allRdts = await getAllRDTs();

function getRdt<T extends string>(value: RDT<T> | undefined) {
    if (value) {
        return [value]
    } else {
        return [];
    }
}
function getRdtUUID<T extends string>(value: RDT<T> | undefined): UUID[] {
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
        range: getRdt(allRdts.find((rdt) => (rdt.type === "Range" && rdt.name === "Touch"))) as RDT<"Range">[],
        duration: getRdt(allRdts.find((rdt) => (rdt.type === "Duration" && rdt.name === "Concentration"))) as RDT<"Duration">[],
        target: getRdt(allRdts.find((rdt) => (rdt.type === "Target" && rdt.name === "Part"))) as RDT<"Target">[],
        description: "Change the stone touched by the caster into clay allowing manipulating it"

    },
    {
        guid: randomUUID(),
        name: "Lampi without Flame", technique: "Cr", form: "Ig", level: 15,
        range: getRdt(allRdts.find((rdt) => (rdt.type === "Range" && rdt.name === "Touch"))) as RDT<"Range">[],
        duration: getRdt(allRdts.find((rdt) => (rdt.type === "Duration" && rdt.name === "Concentration"))) as RDT<"Duration">[],
        target: getRdt(allRdts.find((rdt) => (rdt.type === "Target" && rdt.name === "Individual"))) as RDT<"Target">[],
        description: "Create a directionless light equal to lamplight."

    }

];

export async function getAllSpells(): Promise<SpellModel[]> {

    const spells = await createApiConnection().then(

        (dbh) => {
            return dbh.query<{guid:UUID, value: ApiSpellModel}>("select guid, value from api_spells").then(
                (result) => {
                    console.log("Got %d spells from database", result.rowCount ?? 0);
                    return Promise.all(result.rows.map( async (entry: {guid: UUID, value: ApiSpellModel}) => {
                        return {...(await convertApiToSpell(entry.value)), guid: entry.guid};
                    }));
                }
            ).finally( () => { safeRelease(dbh)});
        }
    ).catch( (error) => {
        logger.error(error, "Could not retrieve spells");
        return [...spellStore];
    })

    return spells;
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
export interface Reference<TYPE extends string | undefined = string | undefined> {
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
    size: UUID[],
    other: UUID[]
    level: SpellLevel;
    form: string | Reference<"art.form">;
    technique: string | Reference<"art.technique">;
    guideline?: UUID;
    traits?: string[];
}

export type NewApiSpellModel = Omit<ApiSpellModel, "guid">

/**
 * Convert spell model to Api spell.
 * @param spell The conveted spell. 
 * @returns The spell model, or a new spell model, of the given spell.
 */
export async function convertSpellToApi(spell: SpellModel | NewSpellModel): Promise<ApiSpellModel | NewApiSpellModel> {

    // Create RDTs for the RDTs not yet implemented.
    async function createRdtIfNecessary<TYPE extends string>(rdts: RDT<TYPE>[] | undefined): Promise<RDT<TYPE>[]> {
        return Promise.all([...(rdts ?? [])].map(async rdt => {
            if (!validUUID(rdt.guid)) {
                /**
                 * @todo Create a new rdt with rdt data source.
                 */
                const uuid: UUID | undefined = await createRDT(rdt).catch((error) => (undefined));
                return { ...rdt, uuid } as RDT<TYPE>
            } else {
                return rdt;
            }
        }));
    };

    const result: ApiSpellModel | NewApiSpellModel = {
        name: spell.name,
        level: spell.level,
        guideline: spell.guideline ? checkUUID(spell.guideline) : undefined,
        technique: spell.technique,
        form: spell.form,
        range: await createRdtIfNecessary<"Range">(spell.range).then((all) => (all.map(rdt => (rdt.guid as UUID)))),
        duration: await createRdtIfNecessary<"Duration">(spell.duration).then((all) => (all.map(rdt => (rdt.guid as UUID)))),
        target: await createRdtIfNecessary<"Target">(spell.target).then((all) => (all.map(rdt => (rdt.guid as UUID)))),
        size: await createRdtIfNecessary<"Size">(spell.size).then((all) => (all.map(rdt => (rdt.guid as UUID)))),
        other: await createRdtIfNecessary<string>(spell.other).then((all) => (all.map(rdt => (rdt.guid as UUID)))),
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

    console.group("Covnerting spell");
    console.dir(spellApi);

    /**
     * Get art key, if needed.
     * @param value The value, which is either art, guid or 
     * @param taskList The optional task list to store the tasks fo seeking art keys.
     * @returns The promise of the art key.
     */
    async function getArtKeyIfNeeded<TYPE extends string>(value: Reference<TYPE> | string, taskList?: Promise<any>[]): Promise<string> {
        if (typeof value === "string") {
            return value;
        } else if (value.type && !value.type.startsWith("art.")) {
            // Not a reference to an art. 
            throw "Not an art reference!";
        } else if (taskList) {
            const result: Promise<string> = getAllArts().then(arts => (arts.find(art => (art.guid === value.guid))))
                .then((res) => { if (res) { return res.abbrev; } else { throw "Not found" } });
            taskList.push(result);

            return result
        } else {
            const result = (await getAllArts()).find(art => (art.guid === value.guid));
            if (result) {
                return result.abbrev;
            } else {
                throw "Art not found";
            }
        }
    }
    const allRdts = await getAllRDTs();

    async function getRDTValue<TYPE extends string>(ids: UUID[], type: TYPE | TYPE[]): Promise<RDT<TYPE>[]> {
        return ids.reduce((result: RDT<TYPE>[], uuid: string) => {
            const validTypes: string[] = Array.isArray(type) ? type : [type];
            const found = allRdts.find((cursor) => (cursor.guid === uuid && (validTypes.includes(cursor.type.toString()))));
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

    const result: Partial<SpellModel> = {
        name: spellApi.name,
        level: spellApi.level,
        guideline: spellApi.guideline,
        traits: spellApi.traits,
        technique: await getArtKeyIfNeeded(spellApi.technique),
        form: await getArtKeyIfNeeded(spellApi.form),
        range: await getRDTValue<"Range">(spellApi.range, "Range"),
        duration: await getRDTValue<"Duration">(spellApi.duration, "Duration"),
        target: await getRDTValue<"Target">(spellApi.target, "Target"),
    };
    console.dir(result);
    console.groupEnd();
    return checkSpell(result);
}

/**
 * Create a new spell in the system.
 * @param spellModel The spell model. 
 * @returns The promise of the UUID assigned to the spell.
 */
export async function createSpell(spellModel: SpellModel | NewSpellModel) {
    try {
        const apiSpell = await convertSpellToApi(spellModel);
        const headers = new Headers();
        headers.append("Content-Type", "application/json");
        headers.append("Accept", "application/json");
        if (process.env.API_KEY) {
            headers.append("x-openapi-token", process.env.API_KEY);
        }
        return await fetch("http://localhost:" + (process.env.PORT ?? "3000") + "//arm5/spells", {
            method: "POST",
            body: JSON.stringify(apiSpell)
        }).then(
            (result) => {
                if (result.ok) {
                    const uuid = result.json();
                    logger.info("Created spell with %s UUID: %s", validUUID(uuid) ? "valid": "invalid", uuid);
                    return checkUUID(uuid);
                }
                logger.error("Status: %d: %s", result.status, result.statusText);
                throw { message: result.statusText, errorCode: result.status };
            },
            (error) => {
                throw error;
            }
        )
    } catch (error) {
        logger.error(error, "Spell creation failed");
        throw error;
    }
}

export async function storeDbSpells(spells: SpellModel[]) {
    return await createApiConnection().then(
        async dbh => {
            dbh.query("begin");
            return Promise.all(spells.map(async spell => {
                const dbSpell = await convertSpellToApi(spell).then( (result) => (JSON.stringify(result)));
                if (spell.guid) {
                    dbh.query("INSERT INTO spells(guid, value) VALUES ($1, $2) ON CONFLICT DO UPDATE SET value = $2 WHERE guid = $1", [spell.guid, JSON.stringify(dbSpell)]);
                } else {

                }
            })).then( async (result) => {
                await dbh.query("commit");
                dbh.release();
                return result;
            }, (error) => {
                console.error("Inserting spells failed:%s", error);
                dbh.query("rollback");
                dbh.release();
                throw new Error("Could not add spells", {cause: error});
            })
        });
}

/**
 * Store spells
 * @param spells The stored spells.
 * @param altered The altered user interfaces.
 */
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
                    spells.push({ ...spell, guid: uuid });
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



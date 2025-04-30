import { randomUUID } from "crypto";
import { RDT } from "./modifiers";

export interface SpellModel {

    /**
     * The guid of the spell model, if it has been stored into the API.
     */
    guid?: string;
    /**
     * The guideline of the spell.
     */
    guideline?: string;
    /**
     * The name of the spell.
     */
    name: string;
    /**
     * The description of the spell.
     */
    description?: string;
    /**
     * The level of the spell.
     */
    level: number | "Generic";
    /**
     * The technique abbreviation.
     */
    technique: string;
    /**
     * The form abbreviation.
     */
    form: string;


    /**
     * The Ranges of the spell. 
     */
    range?: RDT<"Range">[];
    /**
      * The Durations of the spell. 
      */
    duration?: RDT<"Duration">[];
    /**
      * The Targets of the spell. 
      */
    target?: RDT<"Target">[];

    /**
     * The traits of the spell. 
     */
    traits?: string[];

}

/**
 * The model of a new spell without guid assigned to it.
 */
export type NewSpellModel = Omit<SpellModel, "guid">;


/**
 * Zerofill level with prefix ensuring the string comparison yields correct
 * ascending order of level. Due this generic is appended with + making them
 * before any numeric levels, and _ instead of + to ensure positive numbers
 * are after negative numbers.
 * @param value The level value.
 * @returns The string of level key. 
 */
function zeroFill(value: number | "Generic"): string {
    if (typeof value === "number") {
        const candidate = `${Math.abs(value)}`;
        return (value < 0 ? "-" : "_") + "0".repeat(3 - candidate.length) + candidate;
    } else {
        return "+" + value.substring(0, 3);
    }
}

/**
 * Does the spell have trait.
 * @param spell The spell.
 * @param trait The sought trait.
 * @returns True, if and only if the spell has given trait.
 */
export function hasTrait(spell: SpellModel | NewSpellModel, trait: string) {
    return (spell.traits && spell.traits.includes(trait));
}

/**
 * Get the spell model sort key.
 * @param spell The spell. 
 */
export function getSpellSortKey(spell: SpellModel): string {
    return `${spell.form}${spell.technique}${(hasTrait(spell, "General") && (Number.isInteger(spell.level) ? " " : " ")) + zeroFill(spell.level)}${spell.name}`;
}

/**
 * Get the key of the spell.
 * @param spell The spell.
 * @returns 
 */
export function getSpellKey(spell: SpellModel) {
    if (spell.guid) {
        return spell.guid;
    } else {
        return getSpellSortKey(spell);
    }
}


export async function getAllSpells(): Promise<SpellModel[]> {
    return Promise.resolve([{ name: "Test spell one", level: 15, form: "Te", technique: "Cr", guideline: randomUUID().toString() }]);
}
export interface ArtModel {
    guid?: string;
    art: string;
    abbrev: string;
    style: string;
    type: "Technique" | "Form";
}
export async function getAllForms(): Promise<ArtModel[]> {
    return Promise.resolve([]);
}
export async function getAllTechniques(): Promise<ArtModel[]> {
    return Promise.resolve([]);
}
export interface GuidelineModel {
    guid?: string;
    technique: string;
    form: string;
    level: number | "Generic";
    description?: string;
    name: string;
}
type NewGuideline = Omit<GuidelineModel, "guid">;
type ExistingGuideline = Required<Pick<GuidelineModel, "guid">> & Omit<GuidelineModel, "guid">;
export async function getAllGuidelines(): Promise<GuidelineModel[]> {
    return Promise.resolve([]);
}
export function getGuidelineValue(guidelines: GuidelineModel[], value: GuidelineModel | string): GuidelineModel | undefined {
    if (typeof value === "string") {
        // Guid search only.
        return guidelines.find((cursor) => (cursor.guid === value));
    } else if (value.guid) {
        // Both GUID and equality is used. 
        return guidelines.find((cursor) => (cursor === value || cursor?.guid === value.guid));
    } else {
        // Identity search only.
        return guidelines.find((cursor) => (cursor === value));
    }
}


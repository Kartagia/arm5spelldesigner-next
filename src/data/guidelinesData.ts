
/**
 * Guidelines data source.
 */

import { createIdentified, promised, TruePredicate } from "../lib/utils";
import { fetchArt, getArt } from "./artData";
import Art from "./arts";
import { ArrayDao } from "./dao";
import { GUID } from "./guid";
import { ArtKey, Spell, SpellGuideline } from "./spells";
import { Level } from "@/lib/level";
import { Identified } from "@/lib/utils";
import { NotFoundError } from "@/lib/exception";
import { parseGuidelines } from "@/lib/guidelineParser";

/**
 * Get the art key of a value.
 * @param art The art GUID, art key, or art.
 * @throws {NotFoundError} The art was not found.
 */
export function getArtKey(art: GUID | ArtKey | Art): ArtKey {
    if (art instanceof ArtKey) {
        return art;
    } else if (art instanceof Art) {
        return art.abbrev;
    }

    const result = promised(fetchArt(art).then(
        (value) => {
            return value.abbrev;
        },
        (error) => {
            throw new NotFoundError<typeof error, string>({ message: "Art not found", cause: error, details: "Referred art does not exist" });
        }
    ));
    if (result === undefined) {
        throw new NotFoundError<void, string>({ message: "Art not found", details: "Referred art does not exist" });
    } else {
        return result;
    }
}


/**
 * The key of a guideline.
 */
export class SpellGuidelineKey {
    private myForm: ArtKey;
    private myTechnique: ArtKey;
    private myLevel: Level;
    private myName: string;

    /**
     * Create spell guideline key.
     * @param guideline The guideline, whose key is generated.
     * @returns The spell key of the spell.
     */
    static fromGuideline(guideline: SpellGuideline) {
        return new SpellGuidelineKey(getArtKey(guideline.form), getArtKey(guideline.technique), guideline.level, guideline.name);
    }

    /**
     * Create a new spell guideline key.
     * @param form The form of the guideline.
     * @param technique The technique of the guideline.
     * @param level The level of the guideline.
     * @param name The name of the guideline.
     */
    constructor(form: ArtKey, technique: ArtKey, level: Level, name: string) {
        this.myForm = form;
        this.myTechnique = technique;
        this.myLevel = level;
        this.myName = name;
    }

    /**
     * The name of the guideline.
     */
    get name() {
        return this.myName;
    }

    /**
     * The form of the guideline.
     */
    get form() {
        return this.myForm;
    }

    /**
     * The technique of the guideline.
     */
    get technique() {
        return this.myTechnique;
    }

    /**
     * The level of the guideline.
     */
    get level(): Level {
        return this.myLevel;
    }




    /**
     * Compare arts. 
     * @param compared The compared value.
     * @param comparee The value compared with.
     * @returns Comparison result.
     */
    static artCompare(compared: ArtKey | Art, comparee: ArtKey | Art): number {
        return (compared instanceof Art ? compared.abbrev : compared).toString().localeCompare(
            (comparee instanceof Art ? comparee.abbrev : comparee).toString());
    }

    static levelCompare(compared: Level, comparee: Level): number {
        if (compared === "Generic") {
            return (comparee === "Generic" ? 0 : -1)
        } else if (comparee === "Generic") {
            return 1;
        } else {
            return (compared === comparee ? 0 : compared < comparee ? -1 : compared > comparee ? 1 : Number.NaN);
        }
    }

    static compare(compared: SpellGuidelineKey, comparee: SpellGuidelineKey): number {
        var result = SpellGuidelineKey.artCompare(compared.form, comparee.form);
        if (result === 0) {
            result = SpellGuidelineKey.artCompare(compared.technique, comparee.technique);
        }
        if (result === 0) {
            result = SpellGuidelineKey.levelCompare(compared.level, comparee.level);
        }
        if (result === 0) {
            result = compared.name.localeCompare(comparee.name);
        }

        return result;
    }

    compareTo(other: SpellGuidelineKey): number {
        return SpellGuidelineKey.compare(this, other);
    }
}
/**
 * The array dao.
 */
const guidelines = new ArrayDao<SpellGuideline, SpellGuidelineKey>({
    entries: [
        ...[
            {
                name: "Give an animal +3 bonus to Wound Recovery rolls.", level: 2,
                form: new ArtKey("An"), technique: new ArtKey("Cr")
            },
            {
                name: "Change a superficial property (such as color of fur) of an animal.", level: 1,
                form: new ArtKey("An"), technique: new ArtKey("Mu")
            },
            {
                name: "Give a human +3 bonus to Wound Recovery rolls.", level: 2,
                form: new ArtKey("Co"), technique: new ArtKey("Cr")
            },
            {
                name: "Create a fire dealing (Spell Level + 2 Magnitudes) damage.", level: "Generic" as Level,
                form: new ArtKey("Ig"), technique: new ArtKey("Cr")
            },
            {
                name: "Control a liquid in extremely gentle way.", level: 1,
                form: new ArtKey("Aq"), technique: new ArtKey("Re")
            }

        ].map(guideline => (createIdentified(SpellGuidelineKey.fromGuideline(guideline), { guid: GUID.createV4(), ...guideline })))
    ]
});

export function loadGuidelines(source: URL, contentType: string = "text/plain") {

    promised(
        fetch(source, {}).then(
            (result) => {
                if (result.ok) {
                    switch (contentType) {
                        case "text/plain":
                            return result.text().then(
                                parseGuidelines
                            )
                        case "application/json":
                            return result.json().then(
                                (value) => {
                                    switch (typeof value) {
                                        case "string":
                                            return parseGuidelines(value);
                                        case "object":
                                            if (Array.isArray(value)) {
                                                // An array of guidelines.
                                                const loaded: Identified<SpellGuideline, SpellGuidelineKey>[] = value.reduce(
                                                    (result, guideline, index) => {
                                                        try {
                                                            const key = SpellGuidelineKey.fromGuideline(guideline);
                                                            result.push(createIdentified(key, guideline as SpellGuideline));
                                                            return result;
                                                        } catch (error) {
                                                            const message = "Invalid guideline source";
                                                            console.error(`URL:${source.toString()} at index ${index}: ${message}`)
                                                            throw new SyntaxError(message, {cause: error})
                                                        }
                                                    }, []);
                                                loaded.forEach( (entry) => {
                                                    guidelines.update(entry.id, entry.value).then(
                                                        (ok) => {
                                                            return ok;
                                                        }, 
                                                        (error) => {
                                                            return guidelines.create(entry.value)
                                                        }
                                                    )
                                                })
                                            } else if (value !== null) {
                                                // A single guideline.
                                                const entry = value as SpellGuideline;
                                                const key = SpellGuidelineKey.fromGuideline(entry);
                                                guidelines.update(key, entry).then(
                                                    (ok) => {
                                                        return ok;
                                                    }, 
                                                    (error) => {
                                                        return guidelines.create(entry).then(
                                                            id => (id !== undefined)
                                                        )
                                                    }
                                                )
                                            
                                            }
                                        default:
                                            throw new SyntaxError("Invalid return type");
                                    }
                                }
                            )
                        default:

                    }
                } else {
                    const msg = `Loading guidelines failed ${result.status} ${result.statusText}`;
                    console.error(msg);
                    throw new Error(msg);
                }
            }
        )
    )
}

/**
 * Get the guidelines.
 * @returns The promise of spell guidelines.
 */
export function fetchGuidelines(filter = () => true): Promise<SpellGuideline[]> {
    return guidelines.getSome(filter).then((entries) => (entries.map(entry => (entry.value))));
}

/**
 * Get a specific guideline.
 * @param key The key of the fetched guideline, or the spell.
 * @returns The promise of the guideline.
 */
export function fetchGuideline(key: SpellGuidelineKey | SpellGuideline): Promise<SpellGuideline> {
    return guidelines.get(key instanceof SpellGuidelineKey ? key : SpellGuidelineKey.fromGuideline(key));
}
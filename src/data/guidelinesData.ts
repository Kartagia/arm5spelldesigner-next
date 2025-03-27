
/**
 * Guidelines data source.
 */

import { parse } from "path";
import { promised } from "../lib/utils";
import { fetchArt, getArt } from "./artData";
import Art from "./arts";
import { ArrayDao } from "./dao";
import { GUID } from "./guid";
import { ArtKey, Level, Spell, SpellGuideline } from "./spells";
import { Identified } from "@/lib/utils";
import { NotFoundError } from "@/lib/exception";
import { log } from "console";

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
const guidelines = new ArrayDao<SpellGuideline, SpellGuidelineKey>({ entries: [] });

/**
 * Parse guidelines from a string source.
 * @param guidelines The parsed guidelines.
 * @param logger The optional logger for logged messages.
 * @returns The array of read spell guidelines. 
 */
function parseGuidelines(guidelines: string, logger = console): SpellGuideline[] {
    const lenient = true;
    const results: SpellGuideline[] = [];
    const artNameRegex = Art.ArtNameRegex().source;
    var formHeaderRegex = new RegExp("^\s*" + artNameRegex.substring(2, artNameRegex.length - 3) + "\s+Spells\s*$");
    var techniqueHeaderRegex = new RegExp("^\s*" + artNameRegex.substring(2, artNameRegex.length - 3) + "\s+" +
        artNameRegex.substring(2, artNameRegex.length - 3) +
        "\s+Guidelines" +
        "\s*$");
    var wordRegex = /[\w'+-]+/;
    var sentenceRegex = new RegExp("(?:" + wordRegex.source + "(?:[,]?\s" + wordRegex.source + ")*");
    var newLevelRegex = /^\s*Level\s+(\d+|Generic):\s*(\w.*?\.)(?:\s+((?:\([^\)]*\)|)*))?\s*$/;
    var newGuideline = /^\s*(\w.*?\.)\s*$/;

    type States = "Form" | "Technique" | "Level" | "None"
    type ParseState = {
        state: States,
        form?: ArtKey, technique?: ArtKey,
        level?: Level,
        results: Map<SpellGuidelineKey, SpellGuideline[]>
    }
    const endState = guidelines.split(/$/).reduce((result: ParseState, line, index) => {
        var match;
        if (match = formHeaderRegex.exec(line)) {
            // Starting a new form.
            try {
                result.form = ArtKey.fromArtName(match[1]);
                delete (result.technique);
                delete (result.level);
                result.state = "Form";
            } catch (error) {
                // Transition failed - logging.
                const message = `Invalid form header on line ${index}`;
                logger.error(message)
                if (!lenient) {
                    throw new SyntaxError(message);
                }
            }
        } else if (match = techniqueHeaderRegex.exec(line)) {
            const [form, technique] = [match[1], match[2]];
            try {
                result.form = ArtKey.fromArtName(form);
                result.technique = ArtKey.fromArtName(technique);
                delete (result.level);
                result.state = "Technique";
            } catch (error) {
                // Transition failed - logging.
                const message = `Invalid technique header on line ${index}`;
                logger.error(message)
                if (!lenient) {
                    throw new SyntaxError(message);
                }
            }
        } else if (["Level", "Technique"].some(prop => (result.state === prop)) && (match = newLevelRegex.exec(line))) {
            const [level, name, description = undefined] = [match[1], match[2], match[3]];
            if (level !== undefined || result.state === "Level") {
                try {
                    result.level = level === undefined ? result.level : (level === "Generic" ? level : Number(level));
                    if (result.level === undefined) {
                        // Erroneous state.
                        const message = `Invalid level header on line ${index}`;
                        logger.error(message);
                        if (!lenient) {
                            throw new SyntaxError(message);
                        }
                    } else {
                        result.state = "Level";
                        const key = new SpellGuidelineKey(result.form as ArtKey, result.technique as ArtKey, result.level, name);
                        if (!result.results.has(key)) {
                            result.results.set(key, []);
                        }
                        result.results.get(key)?.push({
                            name, level: result.level, form: result.form as ArtKey, technique: result.technique as ArtKey, description: description
                        });
                    }
                } catch (error) {
                    // Transition failed - logging.
                    const message = `Invalid level header on line ${index}`;
                    logger.error(message)
                    if (!lenient) {
                        throw new SyntaxError(message);
                    }
                }
            }
        } else if (match = /^\s*$/.test(line)) {
            // The line is empty line ending a level or technique block.
            if (result.state === "Level") {
                result.state = "Technique";
                delete (result.level);
            } else if (result.state === "Technique") {
                result.state = "Form";
                delete (result.technique);
            }
        }
        return result;
    }, { state: "None" as States, results: new Map<SpellGuidelineKey, SpellGuideline[]>() } as ParseState);
    return [...endState.results.values()].reduce( (result, guidelines) => ([...result, ...guidelines]), [])
}

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

                                            } else if (value !== null) {

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
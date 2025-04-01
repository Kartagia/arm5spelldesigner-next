
/**
 * The module containing guideline parser.
 * 
 * @module guideline/parser
 */
import Art from "@/data/arts";
import { SpellGuidelineKey } from "@/data/guidelinesData";
import { SpellGuideline, ArtKey, Level } from "@/data/spells";
import { getRegexSourceContent, groupRegex, AdvancedRegex, combine, alternateRegex } from "./regex";


/**
 * Get the from header regex for parsing the guidelines.
 * @param groupName The group name.
 * @returns The form ehader regex.
 */

export function formHeaderRegex(groupName: string | undefined = undefined) {
    const artNameRegex = getRegexSourceContent(Art.ArtNameRegex(), { stripEndOfLine: true, stripStartOfLine: true });
    return groupRegex(artNameRegex + "Spells", groupName, { wholeString: true });
}

export function techniqueHeaderRegex(groupName: string | undefined = undefined) {
    const artNameRegex = getRegexSourceContent(Art.ArtNameRegex(), { stripEndOfLine: true, stripStartOfLine: true });
    return groupRegex(artNameRegex + "Spells", groupName, { wholeString: true });
}

export function sentenceRegex(groupName: string | undefined = undefined) {
    const wordRegex = new AdvancedRegex(groupRegex("[A-Z\d+-][\w+-]*", undefined));
    return groupRegex(wordRegex.and(combine({}, ",?\s*?", wordRegex)).and("\."), groupName);
}

export function newLevelRegex(groupName: string | undefined = undefined) {
    const firstLineRegex = combine({}, groupRegex(alternateRegex(groupRegex("Generic|General", "general"), combine({}, "Level\s+", groupRegex("\\d+", "level"))), undefined), "\:\s*?");
    return groupRegex(firstLineRegex.and(groupRegex("", "name")), groupName, { wholeString: true });
}


export function parseGuidelines(guidelines: string, logger = console): SpellGuideline[] {
    const lenient = true;
    const results: SpellGuideline[] = [];
    const artNameRegex = Art.ArtNameRegex().source;
    var formHeaderRegex = new RegExp("^\s*" + artNameRegex.substring(2, artNameRegex.length - 3) + "\s+Spells\s*\n?$");
    var techniqueHeaderRegex = new RegExp("^\s*" + artNameRegex.substring(2, artNameRegex.length - 3) + "\s+" +
        artNameRegex.substring(2, artNameRegex.length - 3) +
        "\s+Guidelines" +
        "\s*\n?$");
    var wordRegex = /[\w'+-]+/;
    var sentenceRegex = new RegExp("(?:" + wordRegex.source + "(?:[,]?\s" + wordRegex.source + ")*" + ")");
    var newLevelRegex = /^\s*Level\s+(\d+|Generic):\s*(\w.*?\.)(?:\s+((?:\([^\)]*\)|)*))?\s*$/;
    var newGuideline = /^\s*(\w.*?\.)\s*$/;

    type States = "Form" | "Technique" | "Level" | "None";
    type ParseState = {
        state: States;
        form?: ArtKey; technique?: ArtKey;
        level?: Level;
        results: Map<SpellGuidelineKey, SpellGuideline[]>;
    };
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
                logger.error(message);
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
                logger.error(message);
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
                    logger.error(message);
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
    return results;
}


import {Predicate, TruePredicate} from "./utils"

/**
 * Regular Expression tools
 */

/**
 * The regular expression builder options.
 */
export interface RegExpBuilderOptions {
    /**
     * Does the operation preserve flags.
     * @default false
     */
    preserveFlags?: boolean;

    /**
     * Does the operation ignore all errors it can ignore.
     * @default false
     */
    lenient?: boolean;

    /**
     * The flags of the regex.
     * @defaults empty string.
     */
    flags?: string;

    /**
     * Does the operation strip source start of line at the start of the regex.
     * @default false
     */
    stripStartOfLine?: boolean;

    /**
     * Does the operation strip source end of line at the end of the regex.
     * @default false
     */
    stripEndOfLine?: boolean;

    /**
     * Does the operation reult in whole string regex. 
     * This surrounds the resulting regexp with ^ and $. 
     */
    wholeString?:boolean;
}
/**
 * Create the Regular Expression flags.
 * @param base The base flags.
 * @param added The added flags.
 * @param removed The removed flags.
 * @returns The set of flags. 
 * @throws {SyntaxError} The flag combination is invalid.
 */
export function createFlags(base: string, added: string = "", removed: string = ""): string {
    return new RegExp("", base.concat(added.split("").filter(flag => (!base.includes(flag))).join("")
    ).split("").filter(flag => (!removed.includes(flag))).join("")).flags;
}

/**
 * The capturing match length.
 * @param match The match.
 * @returns The capturing match length.
 */
export function capturingMatchLength(match: RegExpExecArray | null, tester: Predicate<string|number> = (TruePredicate)): number {
    if (match) {
        return match.slice(1, match.length).reduce( (result, group, index) => (result + (group && tester(index) ? group.length : 0)), 0)
    } else {
        return 0;
    }
}

/**
 * Create a new grouped regex.
 * @param regex The regular expression or the string.
 * @param groupName The group name. If undefined, an non-capturing group is created.
 * If the groupName is an empty string, a capturing group is created. Otherwise a named
 * capturing group is created.
 * @param options The options of the regular expression.
 * @returns The regular expression containing the group.
 * @throws {SyntaxError} The regular expression or the flags was invalid.
 */
export function groupRegex(regex: string | RegExp, groupName: string | undefined, options: RegExpBuilderOptions = {}): RegExp {
    const { preserveFlags = false, lenient = false, flags = "", stripStartOfLine = false, stripEndOfLine = false } = options;
    const re = (regex instanceof RegExp ? regex : new RegExp(regex));
    const startIndex = (stripStartOfLine && re.source.startsWith("/^") ? 2 : 1);
    const endIndex : number= re.source.length - (
        (stripEndOfLine ? capturingMatchLength( (new RegExp("(?!=\\\\)(?:\\\\\\\\)*(\\$\\/" + re.flags + ")$")).exec(re.source)) : 0) + 1);
    const content = re.source.substring(startIndex, endIndex);
    const resultFlags = createFlags(flags, preserveFlags ? re.flags : "");
    if (groupName) {
        return new RegExp(`${options.wholeString ? "^" : ""}(?<${groupName}>${content})${options.wholeString ? "$" : ""}`, resultFlags);
    } else {
        return new RegExp(`${options.wholeString ? "^" : ""}(${groupName === undefined ? "?:" : ""}${content})${options.wholeString ? "$" : ""}`, resultFlags);
    }
}



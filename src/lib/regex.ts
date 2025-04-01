
import { throwIfDisallowedDynamic } from "next/dist/server/app-render/dynamic-rendering";
import { Predicate, TruePredicate } from "./utils"
import { setFlagsFromString } from "v8";

/**
 * The check options.
 */
export interface CheckOptions<TYPE> {
    /**
     * The error message of the check options.
     */
    message?: string;

    /**
     * The smallest allowed value.
     */
    minValue?: TYPE;

    /**
     * The largest allowed value.
     */
    maxValue?: TYPE;
}

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
     * - The flag is ignored for regexp with multiline flag set.
     * @default false 
     */
    wholeString?: boolean;
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
 * The flag options. 
 */
export interface FlagOptions {
    flagName?: string;

    /**
     * The flags included in this flag. 
     * @default [] An mepty list.
     */
    includes?: RegExpFlag[];

    /**
     * The flags required by the flag.
     * @default [] An empty flag.
     */
    requires?: RegExpFlag[];

    /**
     * The flags prohibted by this flag.
     * @default [] An empty flag.
     */
    prohibits?: RegExpFlag[];
}

/**
 * Options for a base flag. A base flat does not allow included flags.
 */
export type BaseFlagOptions = Omit<FlagOptions, "includes">; 

/**
 * Options for a derived flag.
 * Derived flags includes at least one other flag. 
 * 
 * @property {RegExpFlag[]} includes The includes list cannot be empty. @inheritdoc
 */
export type DerivedFlagOptions = Omit<FlagOptions, "includes"> & Required<Pick<FlagOptions, "includes">>;

/**
 * A Regular Expression flag.
 */
export class RegExpFlag {
    readonly flag: string;

    /**
     * The options of the flag.
     */
    readonly options: FlagOptions;


    /**
     * Create a new regular expresion flag.
     * @param flag The flag string.
     * @param options The flag options. Defaults to an empty base flag options.
     */
    constructor(flag: string, options: BaseFlagOptions|DerivedFlagOptions = {}) {
        if (flag.trim().length === 0) {
            throw new SyntaxError("Invalid flag");
        }

        if ("includes" in options && options.includes.length === 0) {
            throw new SyntaxError("Invalid options", {cause: {reason: "There must be at least one included option", property: "includes"}});
        }

        this.flag = flag;
        this.options = { ...options };
    }

    /**
     * Can the flag be combined with a flag.
     * @param other The other flag combined with current flag.
     * @returns True, if and only if the other may be combined with current flag.
     */
    canCombine(other: RegExpFlag): boolean {
        return !((this.options.prohibits ?? []).includes(other) && (other.options?.prohibits ?? []).includes(this))
    }

    /**
     * Does a flag belong to the current flag.
     * @param other The other flag.
     * @returns True, if and only if the flag includes the given flag.
     */
    includes(other: RegExpFlag): boolean {
        return (this.options.includes ?? []).includes(other);
    }

    /**
     * Combine with other flags.
     * @param other The other flags.
     * @returns The list of combined flags.
     * @throws {SyntaxError} Some of the flags was not combinable with other flags.
     */
    combine(...other: RegExpFlag[]): RegExpFlag[] {
        return other.reduce((result: RegExpFlag[], flag: RegExpFlag, index) => {
            if (this.canCombine(flag)) {
                if (!result.find(cursor => (flag.toString() === cursor.toString() || cursor.includes(flag)))) {
                    return [...result.filter( cursor => (!flag.includes(cursor))), flag];
                }
                return result;
            } else {
                throw new SyntaxError("Invalid flag", { cause: flag });
            }
        }, [ this ])
    }

    /**
     * Get the flag string of the flag.
     * @returns The flag string.
     */
    toString() {
        return this.flag;
    }
}

export class RegExpFlags {

    private members: RegExpFlag[] = [];

    constructor(flags: (string | RegExpFlag)[]) {
        this.members = flags.reduce( (result: RegExpFlag[], flag : string|RegExpFlag) => {
            const reFlag = (flag instanceof RegExpFlag ? flag : this.parseFlag(flag));
            if (result.length === 0) {
                return [ reFlag ];
            } else {
                return result[0].combine(...(result.slice(1)), reFlag)
            }
        }, []);
    }

    
    parseFlag( flag: string) : RegExpFlag {
        return RegExpFlags.parse(flag);
    }

    /**
     * Parse multiple flags.
     * @param flags The prased flags.
     * @returns The flags parsed from the string.
     * @throws {SyntaxError} The flags did contain an invalid combination.
     */
    static parseFlags( flags: string) :RegExpFlags {
        return new RegExpFlags(flags.split("").reduce( 
            (result : RegExpFlag[], flag) => {
                const parsedFlag = RegExpFlags.parse(flag);
                return parsedFlag.combine(...result);
            }, 
            [] as RegExpFlag[]
        ));
    }

    /**
     * The unicode flag.
     */
    static UNICODE = new RegExpFlag("u", { flagName: "unicode"});

    /**
     * Parse a flag.
     * @param flag The string ot parse flag.
     * @return The parsed flag.
     * @throws {SyntaxError} The flag is not a valid flag.
     */
    static parse(flag: string): RegExpFlag {
        switch (flag) {
            case "d": return new RegExpFlag(flag, { flagName: "indices"});
            case "g": return new RegExpFlag(flag, { flagName: "global"});
            case "i": return new RegExpFlag(flag, { flagName: "ignore case"});
            case "m": return new RegExpFlag(flag, { flagName: "multiline"});
            case "s": return new RegExpFlag(flag, { flagName: "dotAll"});
            case "u": return this.UNICODE;
            case "v": return new RegExpFlag(flag, { flagName: "unicodeSets"});
            case "y": return new RegExpFlag(flag, { flagName: "sticky", includes: [this.UNICODE]});
            default:
                throw new SyntaxError("An invalid flag");
        }
    }

    toString() {
        return this.members.join("");
    }
}

/**
 * The capturing match length.
 * @param match The match.
 * @returns The capturing match length.
 */
export function capturingMatchLength(match: RegExpExecArray | null, tester: Predicate<string | number> = (TruePredicate)): number {
    if (match) {
        return match.slice(1, match.length).reduce((result, group, index) => (result + (group && tester(index) ? group.length : 0)), 0)
    } else {
        return 0;
    }
}

/**
 * Get the regular expression source content.
 * 
 * The source is altered by options {@link RegExpBuilderOptions#wholeString}, {@link RegExpBuilderOptions#stripStartOfLine}, a
 * {@link RegExpBuilderOptions#stringEndOfLine}.
 * 
 * @param regex The regular expression or string.
 * @param options The regex source content.
 * @returns The regular expression source string usable for creating the regular expression.
 */
export function getRegexSourceContent(regex: string | RegExp, options: RegExpBuilderOptions = {}): string {
    const { stripStartOfLine = false, stripEndOfLine = false } = options;
    const re = (regex instanceof RegExp ? regex : new RegExp(regex));
    const startIndex = (stripStartOfLine && re.source.startsWith("^") ? 1 : 0);
    const endIndex: number = re.source.length - (
        (stripEndOfLine ? capturingMatchLength((new RegExp("(?<!\\\\)(?:\\\\\\\\)*(\\$)$")).exec(re.source)) : 0));
    const content = re.source.substring(startIndex, endIndex);
    return `${options.wholeString ? "^" : ""}${content}${options.wholeString ? "$" : ""}`;
    ;
}

/**
 * Advanced Regex adds group tracking to capturing groups.
 * This allows easier construction of regular expressions by combining and grouping advanced regular expressions.
 */
export class AdvancedRegex extends RegExp {

    /**
     * Get the capturing group information of a list of capturing groups.
     * @param capturingGroups The handled capturing groups.
     * @param checkOptions The check options of the checking.
     * @returns The capturing group information structure. 
     * @throws {SyntaxError} The capturing groups were invalid captruing groups.
     */
    static getCapturingGroupInfo(capturingGroups: readonly string[], checkOptions: CheckOptions<string> = {}): { groupNames: string[], capturingGroups: string[] } {
        const { message = "Invalid capturing groups" } = checkOptions;
        return capturingGroups.reduce((result: { groupNames: string[], capturingGroups: string[] }, group, index) => {
            if (group) {
                if (/^[a-z]+$/.test(group)) {
                    if (result.groupNames.includes(group)) {
                        throw new SyntaxError(message, { cause: { reason: "Duplicate group name", index, groupName: group } })
                    }
                    result.groupNames.push(group);
                    result.capturingGroups.push(group);
                } else {
                    throw new SyntaxError(message, { cause: { reason: "Invalid group name", groupName: group } });
                }
            } else {
                result.capturingGroups.push(group);
            }
            return result;
        }, { groupNames: [], capturingGroups: [] });

    }

    /**
     * Check capturing groups. 
     * @param capturingGroups The capturing groups.
     * @return Valid set of capturing groups.
     * @throws {SyntaxError} The capturing groups were not a valid capturing groups.
     */
    static checkCapturingGroups(capturingGroups: readonly string[], checkOptions: CheckOptions<string> = {}) {
        return this.getCapturingGroupInfo(capturingGroups, checkOptions).capturingGroups;
    }

    /**
     * The capturing groups of the advanced pattern.
     */
    readonly capturingGroups: string[];

    /**
     * Create a new advanced regex.
     * @param pattern The pattern of the regular expression.
     * @param capturingGroups The capturing groups of the regular expression. A named capturing groups are represented by the
     * group name, and capturing groups are reprsented with empty string.
     * @param options The regular expresison builder options. 
     */
    constructor(pattern: string | RegExp | AdvancedRegex, capturingGroups: readonly string[] = [], options: RegExpBuilderOptions = {}) {
        const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        super(getRegexSourceContent(pattern, options), createFlags(re.flags, options.flags));
        this.capturingGroups = AdvancedRegex.checkCapturingGroups(capturingGroups);
    }

    /**
     * The list of capturing group names.
     */
    get groupNames(): string[] {
        return this.capturingGroups.filter(groupName => (groupName));
    }


    /**
     * Create regular expression with given regular expression following the current group.
     * @param other The regular expression or a pattern string combined with the current.
     * @returns The regular expression combining the current regular expression with other following it.
     */
    and(other: RegExp | string | RegexpGroup): AdvancedRegex {
        if (other instanceof RegexpGroup) {
            return new AdvancedRegex(getRegexSourceContent(this) + getRegexSourceContent(other), [...this.capturingGroups, ...other.capturingGroups]);
        } else {
            return new AdvancedRegex(getRegexSourceContent(this) + getRegexSourceContent(other), this.capturingGroups);
        }
    }

    /**
     * Create regular expression with current regular expression or an alternate regular expression.
     * @param other The regular expression or a pattern string combined with the current.
     * @returns The regular expression matching to either current regular expresion or other.
     */
    or(other: RegExp | string | RegexpGroup): AdvancedRegex {
        if (other instanceof RegexpGroup) {
            return new AdvancedRegex(getRegexSourceContent(this) + "|" + getRegexSourceContent(other), [...this.capturingGroups, ...other.capturingGroups]);
        } else {
            return new AdvancedRegex(getRegexSourceContent(this) + "|" + getRegexSourceContent(other), this.capturingGroups);
        }
    }

}

export class RegexpGroup extends RegExp {

    /**
     * The source of the group content.
     */
    readonly groupContentSource: string;

    /**
     * The group name of the regex group.
     */
    readonly groupName: string | undefined;

    /**
     * The capturing groups of the regex.
     * - Named capturing groups are represented with group name.
     * - Unnamed capturing gruops are represented with empty strings.
     */
    readonly capturingGroups: string[];

    /**
     * Create a new regexp group.
     * @param pattern The pattern contained in the group.
     * @param flags The flags of the created regular expression.
     * @param groupName The group name. If undefined, a non-capturing group is created. If empty string, an unnamed capturing group
     * is created. If named, the group name of the named capturing group. 
     * @param capturingGroups The capturing groups of the pattern. 
     */
    constructor(pattern: string | RegExp = "", flags: string | undefined = undefined, groupName: string | undefined = undefined, capturingGroups: string[] = []) {
        const re = groupRegex(pattern, groupName, { flags });
        super("(" + (groupName === undefined ? "?:" : groupName ? `?<${groupName}>` : "") + getRegexSourceContent(re) + ")", flags);
        this.groupContentSource = getRegexSourceContent(pattern);
        this.groupName = groupName;
        const capturingGroupInfo: { groupNames: string[], capturingGroups: string[] } = AdvancedRegex.getCapturingGroupInfo(capturingGroups);
        if (groupName && capturingGroupInfo.groupNames.includes(groupName)) {
            throw new SyntaxError("Invalid group name", { cause: new Error("Duplicate group name", { cause: groupName }) });
        }
        if (groupName !== undefined) {
            capturingGroupInfo.capturingGroups.push(groupName);
            if (groupName) {
                capturingGroupInfo.groupNames.push(groupName);
            }
        }
        this.capturingGroups = capturingGroupInfo.capturingGroups;
    }

    /**
     * Is the group capturing groups.
     */
    get isCapturing() {
        return this.groupName != undefined;
    }

    /**
     * The list of capturing group names.
     */
    get groupNames(): string[] {
        return this.capturingGroups.filter(groupName => (groupName));
    }

    /**
     * Create regular expression with given regular expression following the current group.
     * @param other The regular expression or a pattern string combined with the current.
     * @returns The regular expression combining the current regular expression with other following it.
     */
    and(other: RegExp | string | RegexpGroup): AdvancedRegex {
        if (other instanceof RegexpGroup) {
            return new AdvancedRegex(getRegexSourceContent(this) + getRegexSourceContent(other), [...this.capturingGroups, ...other.capturingGroups]);
        } else {
            return new AdvancedRegex(getRegexSourceContent(this) + getRegexSourceContent(other), this.capturingGroups);
        }
    }

    /**
     * Create regular expression with current regular expression or an alternate regular expression.
     * @param other The regular expression or a pattern string combined with the current.
     * @returns The regular expression matching to either current regular expresion or other.
     */
    or(other: RegExp | string | RegexpGroup): AdvancedRegex {
        if (other instanceof RegexpGroup) {
            return new AdvancedRegex(getRegexSourceContent(this) + "|" + getRegexSourceContent(other), [...this.capturingGroups, ...other.capturingGroups]);
        } else {
            return new AdvancedRegex(getRegexSourceContent(this) + "|" + getRegexSourceContent(other), this.capturingGroups);
        }
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
    const content = getRegexSourceContent(regex, { ...options, wholeString: false });
    const { preserveFlags = false, lenient = false, flags = "" } = options;
    const re = new RegExp(content, flags);
    const resultFlags = createFlags(flags, preserveFlags && regex instanceof RegExp ? regex.flags : "");
    if (groupName) {
        return new RegExp(`${options.wholeString ? "^" : ""}(?<${groupName}>${content})${options.wholeString ? "$" : ""}`, resultFlags);
    } else {
        return new RegExp(`${options.wholeString ? "^" : ""}(${groupName === undefined ? "?:" : ""}${content})${options.wholeString ? "$" : ""}`, resultFlags);
    }
}

export function alternateRegex(options: RegExpBuilderOptions, ...members: (string | RegExp)[]): RegExp {
    const contents = members.reduce((result: { flags?: string, regex?: RegExp }, regex) => {
        const re = regex instanceof RegExp ? regex : new RegExp(regex);
        const flags = createFlags(result.flags ?? "", (options.preserveFlags ? re.flags : ""))
        return {
            flags: flags,
            regex: new RegExp((result.regex ? getRegexSourceContent(result.regex, { ...options, wholeString: false }) + "|" : "") + getRegexSourceContent(re, { ...options, wholeString: false }), flags)
        };
    }, {})
    if (contents.regex) {
        return new RegExp(getRegexSourceContent(contents.regex, { ...options, stripEndOfLine: false, stripStartOfLine: false }), contents.flags);
    } else {
        return new RegExp("", contents.flags);
    }
}

/**
 * Combine several regular expressions into a new regular expression.
 * @param options The builder options of the regular expression.
 * @param members The members of the combine.
 * @returns 
 */
export function combine(options: RegExpBuilderOptions, member: string | RegExp, ...members: (string | RegExp)[]): AdvancedRegex {
    const { preserveFlags = false, lenient = false, flags = "" } = options;
    const memberOptions = { ...options, wholeString: options.wholeString && !flags.includes("m") };
    const re = new AdvancedRegex(member, [], memberOptions);
    const contentOptions = { ...memberOptions, flags: re.flags };
    const contents = members.reduce((result: AdvancedRegex | undefined, member) => {

        if (result) {
            return result.and(new AdvancedRegex(member, [], contentOptions));
        } else {
            return new AdvancedRegex(member, [], contentOptions);
        }
    }, undefined);
    if (contents) {

        return contents;
    } else {
        return new AdvancedRegex(member, [], options);
    }
}

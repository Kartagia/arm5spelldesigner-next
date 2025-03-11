/**
 * Art model.
 * 
 * This module provides Art related model. 
 */

import { ArtKey } from "./spells";

export interface CheckOptions {
    /**
     * The message of the check.
     */
    message?: string;

}

export class Art {

    /**
     * The art name.
     */
    private myName;
    /**
     * The art type.
     */
    private myType: string;

    /**
     * The art abbreviation. 
     * If abbreviation is undefined, it will be generated from the name.
     */
    private myAbbrev: string | undefined;

    /**
     * The length of the default abbreviation generated from the art name.
     */
    defaultAbbrevLength: number;


    /**
     * Create a new art.
     * @param name The art name.
     * @param type The art type.
     * @param abbrev The art abbreviation.
     * @param defaultAbbrevLength The default abbreviation length.
     * @throws {SyntaxError} Any parameter was invalid.
     */
    constructor(name : string, type: string, abbrev:string|undefined=undefined, defaultAbbrevLength=2) {
        this.myName = this.checkName(name);
        this.myType = this.checkType(type);
        this.myAbbrev = this.checkAbbrev(abbrev);
        this.defaultAbbrevLength = defaultAbbrevLength;
    }

    /**
     * The name of the art.
     */
    get name() {
        return this.myName;
    }

    /**
     * The type of the art.
     */
    get type() {
        return this.myType;
    }

    /**
     * The abbreviation of the art.
     */
    get abbrev() {
        return new ArtKey(this.myAbbrev || this.name.substring(this.defaultAbbrevLength))
    }

    /**
     * The magical style of the art.
     */
    get style() {
        const words = this.type.split(" ");
        return words.length > 1 ? words.slice(0, -1).join(" ") : "Hermetic";
    }

    /**
     * Check validity of a name value.
     * @param value The tested value.
     * @param options The check options.
     * @returns A string containing a valid art name.
     * @throws {SyntaxError} The value was not a valid art name.
     */
    static checkName(value: any, options: CheckOptions = {}): string {
        const {message = "Invalid name"} : CheckOptions = options;
        if (typeof value === "string" && /^[A-Z][a-z]+$/.test(value)) {
            return value;
        } else {
            throw new SyntaxError(message);
        }
    }

    /**
     * Check validity of a name value.
     * @param value The tested value.
     * @param options The check options.
     * @returns A string containing a valid art name.
     * @throws {SyntaxError} The value was not a valid art name.
     */
    checkName(value: any, options: CheckOptions = {}): string {
        return Art.checkName(value, options);
    }

    /**
     * Check validity of an art abbreviation value.
     * @param value The tested value.
     * @param options The check options.
     * @returns A string containing a valid art abbreviation.
     * @throws {SyntaxError} The value was not a valid art abbreviation.
     */
    static checkAbbrev(value: any, options: CheckOptions = {}): string|undefined {
        const {message = "Invalid abbreviation"} : CheckOptions = options;
        if (value === undefined || (typeof value === "string" && /^[A-Z][a-z]{1,5}$/.test(value)) ) {
            return value;
        } else {
            throw new SyntaxError(message);
        }
    }

    /**
     * Check validity of an art abbreviation value.
     * @param value The tested value.
     * @param options The check options.
     * @returns A string containing a valid art abbreviation.
     * @throws {SyntaxError} The value was not a valid art abbreviation.
     */
    checkAbbrev(value: any, options: CheckOptions = {}): string|undefined {
        return Art.checkAbbrev(value, options);
    }


    /**
     * Check validity of a type value.
     * @param value The tested value.
     * @param options The check options.
     * @returns A string containing a valid art type.
     * @throws {SyntaxError} The value was not a valid art type.
     */
    static checkType(value: any, options: CheckOptions = {}): string {
        const {message = "Invalid name"} : CheckOptions = options;
        if (typeof value === "string" && /^([A-Z][a-z]+\s)*[A-Z][a-z]$/.test(value)) {
            return value;
        } else {
            throw new SyntaxError(message);
        }
    }

    /**
     * Check validity of a type value.
     * @param value The tested value.
     * @param options The check options.
     * @returns A string containing a valid art type.
     * @throws {SyntaxError} The value was not a valid art type.
     */
    checkType(value: any, options: CheckOptions = {}): string {
        return Art.checkType(value, options);
    }
}

/**
 * A magical noun.
 */
export class Form extends Art {

    /**
     * {@inheritDoc}
     */
    constructor(name : string, style : string = "Hermetic", abbrev : string|undefined = undefined, defaultAbbrevLength : number = 2) {
        super(name, `${style} Form`, abbrev, defaultAbbrevLength);
    }
}

/**
 * A magical verb.
 */
export class Technique extends Art {

    /**
     * {@inheritDoc}
     */
    constructor(name : string, style : string = "Hermetic", abbrev : string|undefined = undefined, defaultAbbrevLength : number = 2) {
        super(name, `${style} Technique`, abbrev, defaultAbbrevLength);
    }
}


export default Art;
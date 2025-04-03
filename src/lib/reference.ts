
/**
 * The module containing reference related classes and functions.
 * @module reference
 */

import { checkJournalDate, validJournalDate } from "@/api/SpellGuidelineResponse";
import { GUID } from "@/data/guid";
import { Predicate } from "@/data/utils";
import { CheckOptions } from "../../lib/utils";

/**
 * The reference. 
 */
export class Reference {
    /**
     * The referred GUID.
     */
    readonly guid: GUID;
    /**
     * The curretn date.
     */
    readonly currentDate: string;
    /**
     * The optional type of the reference.
     */
    readonly type: string | undefined;

    /**
     * Create a reference from parsed JSON value.
     * @param value The JSON parse result.
     * @returns The reference.
     * @throws {SyntaxError} The value was not a valid reference.
     */
    static from(value: object, options: ReferenceCheckOptions = {}): Reference {
        return checkReference(value, { message: "Invalid value", ...options });
    }

    /**
     * Create a new reference.
     * @param guid The referred GUID.
     * @param currentDate The current date of the reference. 
     * @param type The optional type of the reference.
     */
    constructor(guid: GUID | string, currentDate: string, type: string | undefined = undefined) {
        this.guid = typeof guid === "string" ? GUID.fromString(guid, { message: "Invalid guid" }) : guid;
        this.currentDate = checkJournalDate(currentDate);
        this.type = type;
    }

    /**
     * Convert reference to JSON serialization.
     * @returns The string containing the JSON representation of the reference.
     */
    toJSON() {
        return JSON.stringify({
            guid: this.guid.toString(),
            currentDate: this.currentDate,
            type: this.type
        })
    }
}

/**
 * The reference checking options.
 */
export interface ReferenceCheckOptions {

    /**
     * The valid type, or a function checking a valid type.
     */
    type?: string | Predicate<string | undefined>;
    /**
     * The valid GUID.
     */
    guid?: GUID | Predicate<GUID | string>;
    /**
     * The valid current date.
     */
    currentDate?: string | Predicate<string>;
}

/**
 * Check validity of a reference.
 * @param value The tested value.
 * @param options The test options.
 * @returns Valid reference.
 * @throws {SyntaxError} The value was not a valid reference.
 */
export function checkReference(value: any, options: CheckOptions<object> & ReferenceCheckOptions = {}) {
    const { message = "Invalid reference" } = options;

    const validator = (value: object) => {
        var result: boolean = true;
        if (result && options.guid) {
            if (options.guid instanceof Function) {
                result = "guid" in value
                    && (value.guid instanceof GUID || typeof value.guid === "string" && GUID.GUIDRegex().test(value.guid))
                    && options.guid(value.guid);
            } else {
                result = "guid" in value && (value.guid === options.guid.toString());
            }
        }
        if (result && options.currentDate) {
            if (options.type instanceof Function) {
                result = "currentDate" in value &&
                    (typeof value.currentDate === "string" && validJournalDate(value.currentDate) ||
                        typeof value.currentDate === "undefined") && options.type(value.currentDate);
            } else {
                result = "currentDate" in value &&
                    (typeof value.currentDate === "string" && validJournalDate(value.currentDate) ||
                        typeof value.currentDate === "undefined") && (options.type === value.currentDate);
            }
        }

        if (result && options.type) {
            if (options.type instanceof Function) {
                result = options.type("type" in value && typeof value.type === "string" ? value.type : undefined);
            } else {
                result = ("type" in value ? value.type : undefined) === options.type;
            }
        }

        return result;
    };
    if (value instanceof Object && validator(value)) {
        return new Reference(value.guid, value.currentDate, value.type);
    } else {
        throw new SyntaxError(message);
    }
}


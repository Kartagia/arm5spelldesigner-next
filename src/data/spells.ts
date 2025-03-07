
/**
 * Module containing spell related types and methods.
 */

import { getTargetTriple } from "next/dist/build/swc/generated-native";
import { GUID } from "./guid";

/**
 * The spell data structure without methods.
 */
export interface SpellPojo {
    /**
     * The name of the spell.
     */
    name: string;
    /**
     * The ranges of the spell.
     */
    ranges: RDTValue[];
    /**
     * The durations of the spell.
     */
    durations: RDTValue[];
    /**
     * The targets of the spell.
     */
    targets: RDTValue[];
    /**
     * The level of the spell.
     */
    level: Level;
    /**
     * The rqeuisites of the spell.
     */
    requisites: SpellRequisite[];

    /**
     * Is the spell generic.
     */
    isGeneric: boolean;

    /**
     * The global universal identifier associated with the spell.
     */
    guid?: GUID;
}
/**
 * A spell implements methods to the POJO.
 */
export class Spell implements SpellPojo {



    /**
     * Create a new spell.
     * @param pojo The POJO of the spell.
     * @param guid The GUID associated to the spell.
     */
    constructor(pojo: SpellPojo, guid: GUID | undefined = undefined) {
        this.name = pojo.name;
        this.ranges = [...pojo.ranges];
        this.durations = [...pojo.durations];
        this.targets = [...pojo.targets];
        this.level = pojo.level;
        this.requisites = [...pojo.requisites];
        this.guid = guid;
    }

    equalRDTValue(tested: RDTValue | GUID, testee: string | RDTValue): boolean {
        if (tested instanceof GUID) {
            // The GUID must be processed.
            /**
             * @todo Fetch RDT from API and perform equality with result.
             */
            return (typeof testee !== "string") && tested.toString() === testee.guid?.toString();
        } else if (typeof testee === "string") {
            // The tested is a string.
            return "all" == testee || tested.name === testee;
        } else {
            return testee.name === tested.name && testee.modifier === tested.modifier;
        }
    }

    checkRDTs(rdts: RDT[]): boolean {
        return rdts.length > 0 && rdts.reduce((result: { current: RDTValue | undefined; result: boolean; }, rdt: RDTValue, index) => {
            if (result.result && (index === 0 || result.current != undefined && "secondaryRDTs" in result.current &&
                ["all", rdt.name].some(tested => (result.current?.secondaryRDTs?.find(val => (this.equalRDTValue(val, tested))))))) {
                result.current = rdt;
            }
            return result;
        }, { current: undefined, result: true }).result;
    }

    guid?: GUID;
    name: string;
    ranges: RDTValue[];
    durations: RDTValue[];
    targets: RDTValue[];
    level: number | "Generic";
    requisites: SpellRequisite[];
    get isGeneric() {
        return this.level === "Generic";
    }
}

/**
 * A tag is a valid reference to a value in mechanics.
 */
export class Tag {

    /**
     * The tag value.
     */
    _tag: string;

    constructor(tag: string) {
        this._tag = this.check(tag);
    }

    /**
     * Check the validity of a tag value.
     * @param value the tested value.
     * @param param1 The options of the check.
     * @returns A valid tag content.
     * @throws {SyntaxError} The value was not a valid value.
     */
    static check(value: any, {message = "Invalid tag content"}={}): string {
        if (typeof value == "string" && /^([a-z]\w*)(?:\.[a-z]\w+)*$/.test(value)) {
            return value;
        } else {
            throw new SyntaxError(message);
        }

    }

    /**
     * Check the validity of a tag value.
     * @param value the tested value.
     * @param options The options of the check.
     * @returns A valid tag content.
     * @throws {SyntaxError} The value was not a valid value.
     */
    check(value: any, options={}): string {
        return Tag.check(value, options);
    }

    /**
     * Convert the value to string.
     * @returns The string content of the tag.
     */
    toString() {
        return this._tag;
    }
}

/**
 * An interface of game mechanics.
 */
export interface GameMechanics<TARGET> {
    /**
     * The modified target.
     */
    target: TARGET;

    /**
     * The name of the modifier.
     */
    name?: string;

    /**
     * The tag 
     */
    tag?: string;

}

export interface OperatorFunction<TARGET, VALUE> {(target : TARGET, value : VALUE): VALUE};

export class QuotedString {

    /**
     * The content of the quoted string.
     */
    _content;

    constructor(content: string) {
        this._content = this.check(content);
    }

    static check(value: any, {message="Invalid quoted string content"}): string {
        if (typeof value === "string" && /^\"(?:[^\"\\]+|\\["\\])*\"$/.test(value)) {
            return value;
        } else {
            throw new SyntaxError(message);
        }
    }

    check(value: any, options={}) {
        return QuotedString.check(value, options);
    }

    toString() {
        return this._content;
    }

    toJSON() {
        return this.toString();
    }
}

export interface Operator<TARGET, VALUE> {

    /**
     * Calculate the operator result.
     * @param target The target value.
     * @param value The operator value.
     */
    apply(target: TARGET, value: VALUE): VALUE;
}

export class DefaultOperator<TYPE> implements Operator<TYPE, TYPE> {

    operator: OperatorFunction<TYPE, TYPE>;

    constructor( fn : OperatorFunction<TYPE, TYPE>) {
        this.operator = fn; 
    }

    apply(source: TYPE, value: TYPE): TYPE {
        return this.operator(source, value);
    }
}

/**
 * A modifier interface.
 */
export interface Modifier<TARGET, VALUE = (boolean|number|QuotedString)> extends GameMechanics<TARGET> {

    /**
     * The operator. 
     */
    operator: OperatorFunction<TARGET, VALUE>;

    /**
     * The value of the operator.
     */
    value: VALUE;
}

/**
 * The spell requisite. 
 */
export interface SpellRequisite {

    requisite: "optional" | "required" | "cosmetic";
    value: number;
    art: GUID | ArtKey;
}
function requisiteToJson(requisite: SpellRequisite): string {

    return "{" +
        `art: ${requisite.art}, ` +
        `requisite: ${requisite.requisite},` +
        `value: ${requisite.value},` +
        "\"operator\":\"+\", " +
        "}";
}
export type ArtKey = "";

export type RDT = {
    guid?: GUID;
    name: string;
    modifier: number;
    description?: string;
    secondaryRDTs: GUID[];
};
type RDTInfo = {
    guid?: GUID;
    name: string;
    modifier: number;
    description?: string;
    secondaryRDTs: (RDT | RDTInfo)[];
};

export type RDTValue = (RDTInfo | RDT);

export type Level = number | "Generic";


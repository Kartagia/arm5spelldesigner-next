
/**
 * Module containing spell related types and methods.
 */

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


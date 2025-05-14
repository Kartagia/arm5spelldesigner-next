import { UUID } from "node:crypto";
import { boolean } from "zod";
import { logger } from "./logger";


export interface Modifier {

    target: string;

}

export type Supplier<TYPE> = () => TYPE;

export interface RDT<TYPE extends string> {

    /**
     * THe UUID of the RDT.
     */
    guid?: UUID;

    /**
     * Type of the RDT:
     */
    type: TYPE;

    /**
     * Name of the RDT.
     */
    name: string;

    /**
     * The modifier of the RDT.
     */
    modifier: number;

    /**
     * The descrioptoin of the RDT.
     */
    description?: string;

    /**
     * The subtypes of the rdt. 
     */
    subTypes?: string[];

    /**
     * The secondary RDTs the current RDT allows.
     */
    readonly secondaryRDTs: Readonly<UUID[]>;
}

export function equivalentModifierType(tested: string, other: string): boolean {
    return tested !== "" && other !== "" && (tested === other || other.startsWith(tested + "."));
}


interface RdtTypeParseResult {
    type?: string,
    subType?: string[]
}

interface RdtTypeParseAccumulator {
    done?: boolean,
    result?: RdtTypeParseResult
}

/**
 * Equality function determining equality of values.
 * @param a Compared.
 * @param b Comparee.
 * @returns True, if and only if the values are equivalent.
 */
type Equality<TYPE> = (a: TYPE, b: TYPE) => boolean;

/**
 * The default comparison of values.
 * @param a The compared. 
 * @param b The comparee.
 * @param equality The equality function. Defaults to strict equal.
 * @returns The comparison result. Negative number, if a < b, positive number, if a > b,
 * 0, if a is equal to b, and NaN, if values were not comparable. 
 */
function defaultComparison<TYPE>(a: TYPE, b: TYPE, equality?: Equality<TYPE>): number {
    const eql = equality ?? ((a, b) => (a === b));
    return (eql(a, b) ? 0 : a < b ? -1 : a > b ? 1 : Number.NaN);
}


/**
 * Get source list head shared by two lists.
 * @param source The soruce list.
 * @param target The other list.
 * @param comparison The comparison function.
 * @returns The source list elements contained in the header list.
 */
function headList<TYPE>(source: TYPE[], target: TYPE[], comparison: (a: TYPE, b: TYPE) => number = defaultComparison) {
    let i = 0;
    while (i < Math.min(source.length, target.length) && comparison(source[i], target[i])) {
        // The types are same.
        i++;
    }
    if (i === source.length) {
        return source;
    } else {
        return source.slice(0, i);
    }
}

/**
 * Get the widest shared type.
 * @param types The database types.
 */
export function getDbSubType(...types: string[]): RdtTypeParseResult {
    return types.reduce((result: RdtTypeParseAccumulator, dbType) => {
        if (dbType === "") {
            throw new SyntaxError("Database type cannot be empty!");
        }
        if (result.done) {
            return result;
        }

        const [type, ...subtype] = dbType.split(".");
        if (result.result && result.result.type !== type) {
            return { done: true }
        } else if (result.result && result.result.subType && (result.result.subType?.length ?? 0) >= 0) {
            // The sutype checking is necessary.
            return { result: { type: type, subType: headList(subtype, result.result.subType) } }
        } else {
            // WE are first result
            return { result: { type, subtype } };
        }
    }, {} as RdtTypeParseAccumulator).result ?? {};
}

export function equivalentType<TYPE extends string>(tested: RDT<TYPE>, other: RDT<TYPE>): boolean {
    if (tested.type !== other.type || (!tested.subTypes && (other.subTypes?.length ?? 0 > 0))) {
        // The types cannot be equivalent.
        return false;
    }

    // If the tested subtype is totally included in the subtype 
    const subType = headList(tested.subTypes ?? [], other.subTypes ?? []);
    return subType === tested.subTypes;
}

/**
 * Is a value a valid UUID.
 * @param value The tested value.
 * @returns True, if and only if the value is a valid UUID. 
 */
export function validUUID(value: any) {

    return typeof value === "string" && /^\p{Hex_Digit}{8}(?:-\p{Hex_Digit}{4}){3}-\p{Hex_Digit}{12}$/u.test(value);
}

/**
 * Check validity of an UUID. 
 * @param value The tested value.
 * @returns Valid UUID, if the UUID was valid.
 * @throws {SyntaxError} The UUID was not a valid UUID.
 */
export function checkUUID(value: any): UUID {
    if (validUUID(value)) {
        return value as UUID;
    } else {
        throw new SyntaxError("Not a valid UUID");
    }
}

/**
 * A supplier of UUID values. 
 * @param uuids The UUIDS returned by the supplier.
 * @returns The supllier of a set of UUIDs.
 */
export function UUIDSupplier(uuids: Readonly<UUID[]>): Supplier<UUID[]> {

    return () => {
        return [...uuids];
    }
}

/**
 * Generate secondary RDTs.
 * @param source The source of RDTs.
 * @returns The list of UUIDs.
 */
export function generateSecondaryRDTs<TYPE extends string>(source: Supplier<UUID[]> | UUID[] | RDT<TYPE>[]): UUID[] {
    if (source instanceof Function) {
        return [...source()];
    } else {
        return source.reduce((result: UUID[], value) => {
            if (typeof value === "string") {
                if (validUUID(value)) {
                    result.push(checkUUID(value));
                }
            } else if (validUUID(value?.guid)) {
                result.push(checkUUID(value.guid));
            }
            return result;
        }, []);
    }

}

export function AbstractRDT<TYPE extends string>(type: TYPE,
    name: string, modifier: number = 0, description: string | undefined = undefined, guid?: UUID, secondaryRdts: Supplier<UUID[]> | UUID[] | RDT<TYPE>[] = []
): RDT<TYPE> {
    return {
        name,
        modifier,
        description,
        guid,
        type,
        secondaryRDTs: generateSecondaryRDTs(secondaryRdts),

    }
}

/**
 * String format of one rdt.
 * @param rdt The rdt.
 * @returns The string representation of the rdt.
 */
export function rdtToString<TYPE extends string>(rdt: RDT<TYPE>) {
    return `${rdt.type}:${rdt.name}(${rdt.modifier})`;
}

/**
 * String format of multiple rdts.
 * @param rdts The rdts.
 * @param prefix The optional prefix of the result.
 * @returns The string representation of the rdt.
 */
export function rdtsToString<TYPE extends string>(rdts: RDT<TYPE>[], prefix?: string) {
    return `${prefix ? prefix + ":" : ""}${rdts.map(rdt => (`${rdt.name}(${rdt.modifier})`)).join("/")}`
}


/**
 * Range implementation.
 */
export function Range(
    name: string, modifier: number = 0, description: string | undefined = undefined, guid?: UUID,
    secondaryRdts: Supplier<UUID[]> | RDT<"Range">[] = []): RDT<"Range"> {
    return AbstractRDT<"Range">("Range", name, modifier, description, guid, secondaryRdts);
}

/**
 * Duration impelementation.
 */
export function Duration(
    name: string, modifier: number = 0, description: string | undefined = undefined, guid?: UUID, secondaryRdts: Supplier<UUID[]> | RDT<"Duration">[] = []) {
    return AbstractRDT("Duration", name, modifier, description, guid, secondaryRdts);
}

/**
 * Target implementation.
 */
export function Target(
    name: string, modifier: number = 0, description: string | undefined = undefined, guid?: UUID, secondaryRdts: Supplier<UUID[]> | RDT<"Target">[] = []) {
    return AbstractRDT<"Target">("Target", name, modifier, description, guid, secondaryRdts);
}
/**
 * Get RDT value.
 * @param candidate The cnadidate of the RDT value.
 * @returns The RDT value function.
 */
export function getRDTValue<TYPE extends string>(candidate: RDT<TYPE> | (RDT<TYPE>[]) | undefined): RDT<TYPE>[] {
    if (candidate) {
        return (Array.isArray(candidate) ? candidate : [candidate]);
    } else {
        return [];
    }
}

/**
 * The eqality of RDT values.
 * @type {Equal<RDT<TYPE>>}
 */
export function equalRDTValue<TYPE extends string>(compared: RDT<TYPE> | (RDT<TYPE>[]) | undefined, comparee: RDT<TYPE> | (RDT<TYPE>[]) | undefined): boolean {
    return equalArrays(getRDTValue(compared), getRDTValue(comparee));
}


/**
 * Test equality of arrays.
 * @param compared The compared value.
 * @param comparee The comparee value.
 * @param equal The equality function. @default Object.is The default comparison is Object equality.
 * @returns True, if and only if the compared and comparee contains same values using given equality of values.
 */
export function equalArrays<TYPE>(compared: TYPE[], comparee: TYPE[], equal: (a: TYPE, b: TYPE) => boolean = Object.is): boolean {
    return compared.length === comparee.length && compared.every((item, index) => (equal(item, comparee[index])));
}

/**
 * Determine the validity of the value change.
 * @param current The current value.
 * @param index Changed value index.
 * @param newValue The new value at the index.
 * @returns True, if and only if the value change is vlaid.
 */
export function validRDTChange<TYPE extends string>(current: RDT<TYPE>[], index: number, newValue: RDT<TYPE>): boolean {
    return (index === 0) || (index === current.length && (index === 0 || newValue.guid != null && current[current.length - 1].secondaryRDTs.includes(newValue.guid)));
}

export type RDTChangeAccumulator<TYPE extends string> = { result: RDT<TYPE>[], done?: boolean, current?: RDT<TYPE> }

/**
 * Derive RDT value after a change. 
 * @param current The current value.
 * @param index The index of changed value.
 * @param newValue The new value at index.
 * @returns The RDT value after change. IF the chnage is invalid, or there is no change, the original
 * value is returned. 
 */
export function changeRDT<TYPE extends string>(current: RDT<TYPE>[], index: number, newValue: RDT<TYPE>) {
    if (index === current.length - 1 && newValue === current[current.length - 1]) {
        // No change.
        logger.warn("RDT values are same");
        return current;
    } else if (!validRDTChange(current, index, newValue)) {
        // Change is rejected.
        logger.error("Invalid RDT Change");
        return current;
    }

    // Createing new value by cutting invalidated values from tail.
    logger.debug("Creating hte resulting new array");
    const result = [...current.slice(0, index), newValue, ...(current.slice(index + 1).reduce(
        (result: { done?: boolean, result: RDT<TYPE>[], cursor?: RDT<TYPE> }, current: RDT<TYPE>) => {
            if (result.done || result.cursor == null) {
                return result;
            } else if (current.guid && result.cursor?.secondaryRDTs?.includes(current.guid)) {
                return { result: [...result.result, current], cursor: current };
            } else {
                return { ...result, done: true };
            }
        }, { cursor: newValue, result: [] }).result)];
    logger.debug("The original is equal to new: %s", Object.is(result, current));
    return result;
}

/**
 * Create a new UUID from value.
 * @param value Teh value converted to UUID:
 * @returns A valid UUID generated from the value.
 * @throws {SyntaxError} The value was not suitable for UUID. 
 */
export function createUUID(value: number): UUID {
    if (Number.isSafeInteger(value) && value >= 0) {
        const base = value.toString(16);
        const baseUUID = '0'.repeat(128 / 4 - base.length) + base;
        return checkUUID([[0, 8], [8, 12], [12, 16], [16, 20], [20, 32]].reduce(
            (result: string[], [start, end]) => ([...result, baseUUID.substring(start, end)]), []).join("-"));
    } else {
        throw new SyntaxError("Value cannot be converted into UUID");
    }
}


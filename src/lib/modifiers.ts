import { UUID } from "node:crypto";
import { boolean } from "zod";


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

export function equivalentModifierType( tested: string, other: string): boolean {
    return tested !== "" && other !== "" && (tested === other || other.startsWith(tested + ".") );
}


interface RdtTypeParseResult {
    type?: string,
    subType?: string[]
}

interface  RdtTypeParseAccumulator {
    done?: boolean, 
    result?: RdtTypeParseResult
}

/**
 * Equality function determining equality of values.
 * @param a Compared.
 * @param b Comparee.
 * @returns True, if and only if the values are equivalent.
 */
type Equality<TYPE>  = (a: TYPE, b: TYPE) => boolean;

/**
 * The default comparison of values.
 * @param a The compared. 
 * @param b The comparee.
 * @param equality The equality function. Defaults to strict equal.
 * @returns The comparison result. Negative number, if a < b, positive number, if a > b,
 * 0, if a is equal to b, and NaN, if values were not comparable. 
 */
function defaultComparison<TYPE>(a: TYPE, b:TYPE, equality?: Equality<TYPE>):number {
    const eql = equality ?? ((a, b) => (a === b));
    return (eql(a,b) ? 0 : a < b ? -1 : a > b ? 1 : Number.NaN); }


/**
 * Get source list head shared by two lists.
 * @param source The soruce list.
 * @param target The other list.
 * @param comparison The comparison function.
 * @returns The source list elements contained in the header list.
 */
function headList<TYPE>( source: TYPE[], target: TYPE[], comparison: (a: TYPE, b: TYPE) => number = defaultComparison ) {
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
export function getDbSubType( ...types: string[]): RdtTypeParseResult {
    return types.reduce( (result: RdtTypeParseAccumulator, dbType) => {
        if (dbType === "") {
            throw new SyntaxError("Database type cannot be empty!");
        }
        if (result.done) {
            return result;
        }
        
        const [ type, ...subtype] = dbType.split(".");
        if (result.result && result.result.type !== type) {
            return {done: true}
        } else if (result.result && result.result.subType && (result.result.subType?.length ?? 0) >= 0 ) {
            // The sutype checking is necessary.
            return { result: {type: type, subType: headList(subtype, result.result.subType)}}
        } else {
            // WE are first result
            return {result: {type, subtype}};
        }
    }, {} as RdtTypeParseAccumulator ).result ?? {};
}

export function equivalentType<TYPE extends string>( tested: RDT<TYPE>, other: RDT<TYPE>): boolean {
    if (tested.type !== other.type || (!tested.subTypes && (other.subTypes?.length ?? 0 > 0 ) ) ) {
        // The types cannot be equivalent.
        return false; 
    }

    // If the tested subtype is totally included in the subtype 
    const subType = headList(tested.subTypes ?? [], other.subTypes ?? []);
    return subType === tested.subTypes;
}

export function validUUID(value: any) {

    return typeof value === "string" && /^\p{Hex_Digit}{8}(?:-\p{Hex_Digit}{4}){3}-\p{Hex_Digit}{12}$/u.test(value);
}

export function checkUUID(value: any): UUID {
    if (validUUID(value)) {
        return value as UUID;
    } else {
        throw new SyntaxError("Not a valid UUID");
    }
}

export function UUIDSupplier(uuids: Readonly<UUID[]>):Supplier<UUID[]> {

    return () => {
        return [...uuids];
    }
}

/**
 * Generate secondary RDTs.
 * @param source The source of RDTs.
 * @returns The list of UUIDs.
 */
export function generateSecondaryRDTs<TYPE extends string>(source: Supplier<UUID[]>|UUID[]|RDT<TYPE>[]): UUID[] {
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
        secondaryRDTs: generateSecondaryRDTs(secondaryRdts)
    }
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

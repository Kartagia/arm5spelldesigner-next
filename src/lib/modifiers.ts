import { UUID } from "node:crypto";


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
     * The secondary RDTs the current RDT allows.
     */
    readonly secondaryRDTs: Readonly<UUID[]>;
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

import { TimeoutError } from "./exception";

/**
 * An identified representing an identified value.
 */
export interface Identified<TYPE, ID = string> {

    /**
     * The identifier.
     */
    id: ID;

    /**
     * The value associated to the identifier.
     */
    value: TYPE;

}

/**
 * Createa an identified value.
 * @param id The identifier.
 * @param value The value of the identified.
 * @returns The identified object.
 */
export function createIdentified<TYPE, ID = string>(id: ID, value: TYPE): Identified<TYPE, ID> {
    return {
        get id(): ID {
            return id;
        },
        get value(): TYPE {
            return value;
        }
    };
}

/**
 * The filter filtering entry values.
 * @param id The tested entry identifier.
 * @param value The tested value.
 * @returns True, if and only if the combination of the id and the entry passes the filter.
 */
export type EntryFilter<TYPE, ID = string> = (id: ID, value: TYPE) => boolean;

/**
 * The entry predicate.
 * @param entry The tested entry.
 * @returns True, if and only if the entry passes the predicate.
 */
export type EntryPredicate<TYPE, ID = string> = (entry: [ID, TYPE]) => boolean;

/**
 * The array entry predicate.
 * @param entry The tested entry.
 * @param index The index of the iteration.
 * @param array The array of all entries.
 * @returns True, if and only if the entry passes the predicate.
 */
export type ArrayPredicate<TYPE, ID = string> = (entry: [ID, TYPE], index: number, array: Array<[ID, TYPE]>) => boolean;

/**
 * The iteration entry predicate.
 * @param entry The tested entry.
 * @param index The index of the iteration.
 * @returns True, if and only if the entry passes the predicate.
 */
export type IterPredicate<TYPE, ID = string> = (entry: [ID, TYPE], index: number) => boolean;

/**
 * Covert HTML collection to array of type.
 * @param htmlCollection The HTML collection converted to the array.
 * @param filter The filter function filtering valid elements.
 * @param conveter The converter function converting the elements to type.
 * @returns The array of filered elements.
 */
function htmlCollection2TypedArray<TYPE>(htmlCollection: HTMLCollection, converter: (source: Element) => TYPE, options: {
    filter?: ((item: Element, index: number) => boolean);
    convertedFilter?: ((value: TYPE) => boolean) | ((value: TYPE, index: number) => boolean);
} = {}): TYPE[] {
    const result = [];
    for (var i = 0; i < htmlCollection.length; i++) {
        const item = htmlCollection.item(i);
        if (item != null && (options.filter === undefined || options.filter(item, i))) {
            const typed = converter(item);
            if (options.convertedFilter === undefined || options.convertedFilter(typed, i)) {
                result.push(typed);
            }
        }
    }
    return result;
}
/**
 * Covert HTML collection to array.
 * @param htmlCollection The HTML collection converted to the array.
 * @param filter The filter function filtering valid elements.
 * @returns The array of filered elements.
 */
export function htmlCollection2Array(htmlCollection: HTMLCollection, filter: ((item: Element, index: number) => boolean) = (() => true)) {
    return htmlCollection2TypedArray(htmlCollection, (e) => (e), { filter });
}

/**
 * Wait until the promised value is returned. 
 * @param promise The promise whose rsults we wait.
 * @param options The options of the promise handling.
 * @throws {TimeoutError} The promise was not fulfilled in time.
 */
export function promised<TYPE>(promise: Promise<TYPE>, options : {
    /**
     * The timeout in milliseconds for aborting the operation with {@link TimeoutError}.
     * If the value is 0 or undefined, no timeout happens.
     * @default undefined The default is no timeout. 
     */
    timeout?: number, 
    /**
     * Is the operation lenient returning undefined value instead of exception.
     * @default false The default is exception throwing.
     */
    lenient?: boolean}={}): TYPE|undefined {

    var done:boolean = false;
    var error:any = undefined;
    var result:TYPE|undefined = undefined;
    promise.then( 
        (value) => {
            result = value;
            done = true;
        },
        error => {
            error = error;
            done = true;
        }
    )

    if (options.timeout) {
        const abortTimeout = setTimeout( () => {
            throw new TimeoutError("Promise not fulfilled in time");
        }, options.timeout);
        while (!done) {
        }
        clearTimeout(abortTimeout);
    } else {
        while (!done) {

        }
    }
    if (error && !options.lenient) {
        throw error;
    }
    return result;
}
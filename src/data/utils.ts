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
 * The exception pojo for serialization of an exception.
 */
export type ExceptionPOJO<CAUSE = undefined, DETAILS = undefined> = {
    /**
     * The message of the exception.
     */
    message: string,
    /**
     * The optional cause of the exception.
     */
    cause?: CAUSE | null,
    /**
     * The optional details of the exception.
     */
    details?: DETAILS | null
};

/**
 * Generic exception with possible cause and details.
 * 
 * The exception allows declaring the type of the cause and the exception details the exception contains.
 */
export class Exception<CAUSE = undefined, DETAILS = undefined> extends Error {
    private _details: DETAILS | undefined;

    /**
     * Create a new exception.
     * @param param0 The constructor parameters.
     */
    constructor({ message, cause = undefined, details = undefined }: ExceptionPOJO<CAUSE, DETAILS>) {
        super(message, (cause ? { cause } : {}));
        this.name = this.constructor.name;
        this._details = details == null ? undefined : details;
    }

    /**
     * The optional details of the exception.
     */
    get details() {
        return this._details;
    }

    /**
     * Get the JSON representation string of the exception.
     * @returns The JSON representation string of the exception.
     */
    toJSON() {
        return JSON.stringify({
            message: this.message,
            ...(this.cause ? { cause: this.cause } : {}),
            ...(this.details ? { details: this.details } : {})
        });
    }
}


/**
 * The error for not found value.
 */
export class NotFoundError<TYPE=string> extends Exception<any, TYPE> {

    static defaultError = "Resource not found";

    static generateError(resourceName: string) {
        return `The ${resourceName} not found`;
    }

    constructor({message=NotFoundError.defaultError, details=undefined, cause=undefined}:{
        message:string, 
        cause: any,
        details:TYPE|undefined}) {
        super({message, details, cause});
    }
}


/**
 * The error for an invalid value.
 */
export class InvalidValueError<CAUSE=any, DETAIL=string> extends Exception<any, DETAIL> {


    static generateError(resourceName: string) {
        return `Invalid ${resourceName}`;
    }

    static defaultError = InvalidValueError.generateError("value");


    constructor({message=InvalidValueError.defaultError, details=undefined, cause=undefined}:Partial<ExceptionPOJO<CAUSE, DETAIL>>) {
        super({message, details, cause});
    }
}


/**
 * The error indicating something is not supported.
 */
export class UnsupportedError<CAUSE = undefined> extends Exception<CAUSE> {

    /**
     * The default message generation for methods.
     * @param methodName The method name. Defaults to error of an anonymous
     * operation.
     * @returns The error message for the unsupported method or operation.
     */
    static generateMessage(methodName: string | undefined = undefined): string {
        return `${methodName ? "Operation" : "The" + methodName} not supported`;
    }

    /**
     * Create an unsupported error with a message, and an optional cause.
     * @param message The mesage of the exception.
     * @param cause The optional cause of the exception.
     * @returns The unsupported error with message and cause.
     */
    static withMessage<CAUSE=undefined>(message: string|undefined, cause:CAUSE|undefined = undefined) {
        return new UnsupportedError({message, cause});
    }

    /**
     * Create an unsupported error with the default message for an operation, and an optional cause.
     * @param operationName The operation name.
     * @param cause The optional cuase of the exception.
     * @returns The unsupported error exception with default message for the operation, and the cause.
     */
    static ofOperation<CAUSE=undefined>(operationName: string, cause: CAUSE|undefined=undefined) {
        return new UnsupportedError({message: UnsupportedError.generateMessage(operationName), cause});
    }

    /**
     * Create a new unsupported error.
     * @param param0 The construction parameters.
     */
    constructor({ message = UnsupportedError.generateMessage(), cause = undefined }: Partial<ExceptionPOJO<CAUSE>> = {}) {
        super({ message, cause });
    }
}

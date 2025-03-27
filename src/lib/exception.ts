/**
 * The error for not found value.
 */
export const NotFoundError = "Not Found";


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
     * The default message of the unsupported error.
     */
    static defaultMessage = UnsupportedError.generateMessage();

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
    constructor({ message = UnsupportedError.defaultMessage, cause = undefined }: Partial<ExceptionPOJO<CAUSE>> = {}) {
        super({ message, cause });
    }
}
/**
 * The timeout error indicating the operatoin run out of time.
 */

export class TimeoutError extends Exception<string> {

    /**
     * The default message of the timeout error.
     */
    static defaultMessage = "Out of time";

    /**
     * Create a new timeout error.
     * @param message The message of the timeout.
     * @param cause The cause of the exception.
     */
    constructor(message = TimeoutError.defaultMessage, cause = undefined) {
        super({ message, cause });
    }
}


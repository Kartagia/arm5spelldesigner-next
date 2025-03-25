
export interface CheckOptions<TYPE> {

    /**
     * The error message on failed check.
     */
    message?: string; 

    /**
     * Is the check lenient ignoring as amny errors as possible.
     * @default false
     */
    lenient?: boolean;
}

/**
 * An error response. 
 */
export class ErrorResponse {
    private myErrorCode: string;
    private myMessage: string;

    static fromJSONString(jsonString: string) {
        return ErrorResponse.fromJSON(JSON.parse(jsonString));
    }

    static fromJSON(json: any) {
        if (typeof json === "object" && !Array.isArray(json) && 
        (["message", "errorCode"].every( (prop) => (prop in json 
            && 
            typeof json[prop] === "string"))) ) {
            return new ErrorResponse(json);
        } else {
            throw new SyntaxError("Invalid JSON for ErrorResponse");
        }
    }

    constructor({message, errorCode}: {message:string, errorCode: string}) {
        this.myErrorCode = errorCode;
        this.myMessage = message;
    }

    /**
     * Check validity of a message.
     * @param tested The tested value.
     * @param options The test options.
     * @returns A valid message, if tested was derivable to a valid message.
     * @throws {SyntaxError} The tested was not suitable for message.
     */
    checkMessage(tested: any, options:CheckOptions<string>={}) {
        const {message = "Invalid message", lenient=false} = options;

        if (typeof tested === "string") {
            return tested;
        } else if (lenient && typeof tested === "object" && tested !== null 
            && "toString" in tested && (typeof tested.toString) === "function"
        && typeof tested.toString() === "string" ) {
            return tested.toString();
        } else {
            throw new SyntaxError(message);
        }
    }



    /**
     * Check validity of an error code.
     * @param tested The tested value.
     * @param options The test options.
     * @returns A valid error code, if tested was derivable to a valid 
     * error code.
     * @throws {SyntaxError} The tested was not suitable for message.
     */
    checkErrorCode(tested: any, options:CheckOptions<string>={}) {
        const {message = "Invalid error code", lenient=false} = options;

        if (typeof tested === "string" && /^\d+$/.test(tested)) {
            return tested;
        } else if (lenient && typeof tested === "string" && /^\s*(?:\d\s*)+\s*$/) {
            return Number(tested.replaceAll(/\s+/, "")).toString();
        } else {
            throw new SyntaxError(message);
        }
    }

    /**
     * The error message.
     */
    get message(): string {
        return this.myMessage;
    }

    /**
     * The error code of the error.
     */
    get errorCode(): string {
        return this.myErrorCode;
    }

    toJSON() {
        return JSON.stringify({message: this.message, errorCode: this.errorCode});
    }
}

export default ErrorResponse;
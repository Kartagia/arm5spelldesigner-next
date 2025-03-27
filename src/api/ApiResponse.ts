
/**
 * The exception of an unsupported media type.
 */
export class UnsupportedMediaTypeError<CAUSE=any> extends Error {
    private myMediaType: string;

    /**
     * Create a new unsupported media type exception.
     * @param mediaType The unsupported media type.
     * @param message The error message of the media type.
     * @param cause The cuase of the excpetion.
     */
    constructor(mediaType: string, message: string = "Unsupported media type", cause: CAUSE|undefined = undefined) {
        super(message, {cause});
        this.myMediaType = mediaType;
    }

    /**
     * The unsupported media type.
     */
    get mediaType(): string {
        return this.myMediaType;
    }
}

/**
 * The API response interface.
 */
export interface ApiResponse {

    /**
     * Converts the api response to JSON string.
     * @returns The JSON string of the response.
     */
    toJSON?: () => string;

    /**
     * The plain text response.
     * @returns The plain text response.
     */
    toString?: () => string;

    /**
     * The XML representation of the response. 
     * @returns The XML response containing string.
     */
    toXML?: () => string;

    /**
     * Convert the value to media type.
     * @param mediaType The media type.
     * @throws {UnsupportedMediaTypeError} The media type is not supported.
     */
    toMediaType(mediaType: string):string;

}

/**
 * The conveter of values.
 * @param source The conveterd value.
 * @returns The source converted to a value.
 * @throws {ERROR} The error thrown on invalid source.
 */
export type Converter<TYPE, RESULT=string, ERROR=SyntaxError> = (source: TYPE) => RESULT;

/**
 * Basic implementation of a api response.
 * 
 * @template TYPE The type of the resource values.
 */
export class BasicApiResponse<TYPE> implements ApiResponse {

    /**
     * The value of the response.
     */
    private value: TYPE;

    /**
     * The map from media types to the value converters to the string
     * body of the media type.
     */
    private mediaTypeConverters: Map<string, Converter<TYPE>> = new Map();

    /**
     * Create a new basic api response.
     * @param value The value of the response.
     * @param converters The converters of value to supported media types.
     */
    constructor(value: TYPE, converters: Map<string, Converter<TYPE>>|Iterable<[string, Converter<TYPE>]>) {
        if (converters instanceof Map) {
            for (const [key, value] of converters.entries()) {
                this.mediaTypeConverters.set(key, value);
            }
        } else {
            for (const [key, value] of converters) {
                this.mediaTypeConverters.set(key, value);
            }
        }
        this.value = value;


    }

    /**
     * Get the value of the response.
     * @returns Teh value of the response.
     */
    getValue():TYPE {
        return this.value;
    }

    get toJSON() {
        const mediaType = "application/xml";
        const converter = this.mediaTypeConverters.get(mediaType);
        return converter ? (() => (this.toMediaType(mediaType))) : undefined;
    }

    get toXML():(()=>string)|undefined {
        const mediaType = "application/xml";
        const converter = this.mediaTypeConverters.get(mediaType);
        return converter ? (() => (this.toMediaType(mediaType))) : undefined;
    }

    get toString():(()=>string)|undefined {
        const mediaType = "plain/text";
        const converter = this.mediaTypeConverters.get(mediaType);
        return converter ? (() => (this.toMediaType(mediaType))) : undefined;
    }

    /**
     * Does the response support a media type.
     * @param mediaType The tested media type.
     * @returns True, if and only if the media type is supported.
     */
    supportsMediaType(mediaType: string): boolean {
        return this.mediaTypeConverters.get(mediaType) !== undefined;
    }

    toMediaType<CAUSE=void>(mediaType: string): string {

        var converter: Converter<TYPE>|undefined = this.mediaTypeConverters.get(mediaType)
        if (converter !== undefined)  {
            return converter(this.value);
        } else {
            throw new UnsupportedMediaTypeError(mediaType);
        }
        converter = this.mediaTypeConverters.get("application/xml");
    }
}

export default ApiResponse;
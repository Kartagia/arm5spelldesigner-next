
/**
 * Error related utility functions.
 */

export interface ErrorOutputOptions {
    /**
     * The prefix of the outputted errors. 
     * @default "" Defaults to an empty string.
     */
    prefix?: string;

    /**
     * The message separator.
     * @default ", " The default separator is a comma.
     */
    messageSeparator?: string;

    /**
     * The category separator between error categoris.
     * @default `\n${prefix}` Defaults to a new line followed by the prefix. 
     */
    categorySeparator?: string;
}

/**
 * Create string representation of the error structure.
 * @param errors The errors structure.
 * @param errorKeys The error keys printed. If no keys are given, all keys are printed.
 */
export function stringifyErrors( errors: Record<string, string[]>, options?: ErrorOutputOptions, ...errorKeys: string[]): string {
    const {prefix = "", messageSeparator = ", " } = options ?? {};
    const {categorySeparator = `\n${prefix}`} = options ?? {};
    const keys = Object.getOwnPropertyNames(errors);
    return (errorKeys.length > 0 ? keys.filter( (key) => (errorKeys.includes(key))) : keys).map(
        (key) => ( `${prefix}${key}:${errors[key].join(messageSeparator)}`)
    ).join(categorySeparator);
}
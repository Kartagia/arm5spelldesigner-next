
/**
 * Utilities library.
 */


/**
 * The opitons for checking values.
 */

export interface CheckOptions<TYPE> {

    /**
     * The error message of the failed check.
     */
    message?: string;

    /**
     * The smallest accepted value.
     */
    minValue?: TYPE;

    /**
     * The largest accepted value.
     */
    maxValue?: TYPE;
}/**
 * Check value.
 * @param value The tested value.
 * @param options The optional options of the check.
 * @returns The valid value derived from the value.
 * @throws {SyntaxError} The value was invalid.
 */

export type Check<TYPE> = (value: any, options?: CheckOptions<TYPE>) => TYPE;


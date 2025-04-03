import { Check, CheckOptions } from "../../lib/utils";


/**
 * The type of a level.
 */
export type Level = number | "Generic";

/**
 * Is a value an integer.
 * @param value The tested value.
 * @returns True, if and only if the value is a level.
 */
export function isLevel(value: any): boolean {
    if (typeof value === "string") {
        return value === "Generic";
    } else {
        return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
    }
}

/**
 * @inheritdoc
 * @type {Check<Level>}
 */
export function checkLevel(value: any, options: CheckOptions<Level> = {}): Level {
    const { message = "Invalid level", minValue = 1, maxValue = 255 } = options;
    switch (typeof value) {
        case "number":
            if (Number.isSafeInteger(value) && (typeof minValue !== "number" || minValue <= value)
                && (typeof maxValue !== "number" || value <= maxValue)) {
                return value;
            } else {
                throw new SyntaxError(message, { cause: "Invalid numeric value" });
            }
        case "string":
            if (value === "Generic" || value === "General") {
                return "Generic";
            }
        default:
            throw new SyntaxError(message);
    }
}


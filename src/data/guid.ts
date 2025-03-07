
/**
 * GUID represents a generid UUID.
 *
 * Todo: replace with UUID implementation. The GUID does not check the reserved bit sequence.
 */
export class GUID {

    /**
     * parse GUID from string value.
     * @param strVal
     * @throws {SyntaxError} The string representation was invalid.
     */
    static fromString(strVal: string, { lenient = false, message = "Invalid string representation" }): GUID {
        if (/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(strVal)) {
            return new GUID(BigInt("0x" + strVal.split("-").join("")));

        } else if (lenient && /^\s*([a-fA-F0-9]+)\s*$/.test(strVal)) {
            // Lenient parsing taking 128 least important bits of the hexadecimal value.
            const parsed = strVal.trim();
            return new GUID(BigInt("0x" + parsed.substring(parsed.length - 32)));
        }
        throw new SyntaxError(message);
    }

    /**
     * The value of the GUID.
     */
    value: bigint;

    get version(): bigint {
        const versionIndex = BigInt(4 * (12 + 4 + 3));
        return (this.value & (BigInt(15) << versionIndex)) >> versionIndex;
    }

    /**
     * Create a new UUID from the integer value.
     * @param value The 128-bit big int value of the UUID.
     */
    constructor(value: bigint) {
        this.value = value;
        const mask = BigInt(15) << (BigInt(4 * (12 + 3)));
        if ((this.value & mask) !== mask) {
            throw new SyntaxError("Invalid UUID value");
        }
    }

    toString() {
        const hexString = this.value.toString(16);
        const result = "0".repeat(128 / 4 - hexString.length);
        return [result.substring(0, 8), result.substring(8, 12), result.substring(12, 16), result.substring(16, 20), result.substring(20)

        ].join("-");
    }

    toJSON() {
        return this.toString();
    }
}

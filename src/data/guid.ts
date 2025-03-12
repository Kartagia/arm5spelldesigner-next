
import { parse } from 'path';
import { v4 as uuidv4, validate, version as uuidVersion } from 'uuid';

/**
 * GUID represents a generid UUID.
 *
 * Todo: replace with UUID implementation. The GUID does not check the reserved bit sequence.
 */
export class GUID {

    static GUIDRegex() {
        return /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
    }

    /**
     * Create version 4 GUID. 
     * @param value 
     */
    static createV4(value: bigint | undefined = undefined): GUID {
        if (value === undefined) {
            return GUID.fromString((uuidv4()).toString(), {});
        } else {
            return new GUID(value | (BigInt(4) << GUID.versionOffset), BigInt(4));
        }
    }

    /**
     * parse GUID from string value.
     * @param strVal
     * @throws {SyntaxError} The string representation was invalid.
     */
    static fromString(strVal: string, { lenient = false, message = "Invalid string representation", version = BigInt(4) }): GUID {
        if (this.GUIDRegex().test(strVal)) {
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

    static versionOffset = BigInt(4 * (12 + 4 + 3));

    get version(): bigint {
        const versionIndex = GUID.versionOffset;
        return (this.value & (BigInt(15) << versionIndex)) >> versionIndex;
    }

    /**
     * Create a new UUID from the integer value.
     * @param value The 128-bit big int value of the UUID.
     * @param [version=4] The version of the UUID generated.
     */
    constructor(value: bigint, version: bigint = BigInt(4)) {
        this.value = value;
        const strRep = this.toString();
        if (! (validate(strRep) && BigInt(uuidVersion(strRep)) === version)) {
            throw new SyntaxError("Invalid UUID value" + (validate(strRep) ? `- Invalid version ${uuidVersion(strRep)}` : `- ${strRep} is invalid`));
        }
    }

    toString() {
        const hexString = this.value.toString(16);
        const result = "0".repeat(128 / 4 - hexString.length) + hexString;
        return [result.substring(0, 8), result.substring(8, 12), result.substring(12, 16), result.substring(16, 20), result.substring(20)

        ].join("-");
    }

    toJSON() {
        return this.toString();
    }
}

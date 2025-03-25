import { GUID } from "@/data/guid";

/**
 * GUID returning response.
 */
export class GuidResponse {
    private myGuid: GUID;

    static fromJSON(json: any): GuidResponse {
        if (typeof json === "string") {
            return new GuidResponse(json);
        } else {
            throw new SyntaxError("Invalid global identifier");
        }
    }

    constructor(guid: string) {
        this.myGuid = GUID.fromString(guid, {message: "Invalid global identifier"});
    }

    toJSON() {
        return this.myGuid.toString();
    }

    toString() {
        return this.myGuid.toString();
    }
}
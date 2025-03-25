import { GUID } from "@/data/guid"


export class ConflictingUpdateResponse {
    private myGuids: GUID[];
    private myStrict: boolean;


    constructor({guids = [], strict = false}:{guids: string[], strict: boolean}) {

        this.myGuids = guids.map( (guid, index) => (GUID.fromString(guid, {
            message: `Invalid guid at index ${index}`})));
        this.myStrict = strict;
    }

    /**
     * The problem causing GUIDS.
     */
    get guids() {
        return this.myGuids.map( guid => (guid.toString()));
    }

    /**
     * Is the conflict strict. 
     * 
     * A strict conflict must be handled with forced update
     * creating new copies of conflicting entities.
     */
    get strict():boolean {
        return this.myStrict;
    }

    toJSON() {
        return JSON.stringify(
            {
                guids: this.guids,
                strict: this.strict
            }
        );
    }

    toString() {
        return `Conflicsting GUIDS: [${this.guids.join(", ")}]${this.strict ? " with strict": ""}`
    }
}
import { Dao } from "@/data/dao";
import { GUID } from "@/data/guid";
import { Spell } from "@/data/spells";

/**
 * Spell dao delivers spells to the client.
 */
class SpellDao implements Dao<Spell, GUID, Error> {

    entries: Map<GUID, Spell> = new Map();

    /**
     * Create a new Spell Dao.
     * @param initialEntries The initial entries. @default []
     */
    constructor( initialEntries : Iterable<[GUID, Spell]> = []) {
        [...initialEntries].forEach( ([id, entry])  => {
            this.entries.set(id, entry);
        });
    }

    getAll(): Promise<[GUID, Spell][]> {
        return Promise.resolve([...this.entries.entries()]);
    }
    get(id: GUID): Promise<Spell> {
        const result = this.entries.get(id);
        if (result != undefined) {
            return Promise.resolve(result);
        } else {
            throw new Error("Spell not found");
        }
    }

}

const dao = new SpellDao();

/**
 * Get all spells fulfilling a filter.
 * @param request 
 */
export async function GET(request: Request) {

    const spells = await dao.getAll();

    return new Response(JSON.stringify(spells), {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}


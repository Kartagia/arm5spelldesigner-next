
import { Art, Technique, Form } from './arts';
import { ArtKey } from './spells';
import { GUID } from './guid';
import { randomUUID } from 'crypto';
import { Dao } from './dao';
import { Identified, createIdentified, NotFoundError } from './utils';
/**
 * Art storing DAO.
 */
export class ArtDao implements Dao<Art, string> {

    private arts = new Map<string, Art>();

    constructor( entries: Art[] = []) {
        /*
         * Ensuring that each art in the DAO contains GUID equal to the string key of the art.
         */
        for (var art of entries) {
            if ("guid" in art && art.guid != undefined) {
                this.arts.set(art.guid.toString(), art);
            } else {
                const id = randomUUID();
                const guid = GUID.fromString(id.toString(), {});
                this.arts.set(id, new Art(art.name, art.type, art.abbrev.toString(), art.defaultAbbrevLength));
            }
        }
    }

    getAll(): Promise<Array<Identified<Art, string>>> {
        return Promise.resolve([...(this.arts.entries())].map(([id, value]) => (createIdentified(id, value))));
    }

    getSome(filter: (id: string, value: Art) => boolean): Promise<Array<Identified<Art, string>>> {
        return this.getAll().then((values) => (values.filter(value => (filter(value.id, value.value)))));
    }

    get(id: string): Promise<Art> {
        return new Promise((resolve, reject) => {
            const result = this.arts.get(id);
            if (result === undefined) {
                reject();
            } else {
                resolve(result);
            }
        });
    }

    getByName(name: string): Promise<Art> {
        return this.getSome( (_id, value) => (value.name === name)).then(
            (results) => {
                if (results.length === 1) {
                    return results[0].value;
                } else {
                    throw NotFoundError;
                }
            }
        )
    }

    getByKey(key: ArtKey): Promise<Art> {
        return this.getSome( (_id, value) => (value.abbrev.toString() === key.toString())).then(
            (results) => {
                if (results.length === 1) {
                    return results[0].value;
                } else {
                    throw NotFoundError;
                }
            }
        )
    }

    /**
     * Generate identifier of a value.
     * @param value The value, whose identifier is generated.
     * @returns The promise of the identifier of the value.
     */
    createId(value: Art): Promise<string> {
        return Promise.resolve(randomUUID());
    }

    /**
     * Test validity of a value.
     * @param id The identifier of the value. If undefined, the value has no previous identifier.
     * @param value The tested value.
     * @returns The promise of the validity of the value.
     */
    validValue(id: string | undefined, value: Art): Promise<boolean> {
        /* Ensuring all Arts have unique name and abbreviation among arts of same style */
        if (id === undefined) {
            return this.getSome( 
                (_, currentValue) => (
                    currentValue.style === value.style 
                    || value.name === currentValue.name 
                    || value.abbrev.toString() === currentValue.abbrev.toString())
            ).then( values => {
                return (values.length === 0);
            }, 
            (_error) => {
                return false;
            });
        } else {
            return this.getSome( 
                (currentId, currentValue) => (
                    currentValue.style === value.style 
                    || id === currentId 
                    || value.name === currentValue.name 
                    || value.abbrev.toString() === currentValue.abbrev.toString())
            ).then( values => {
                return (values.length === 1 && values[0].id === id);
            }, error => {
                return false;
            });
        }
    }

    create(value: Art): Promise<string> {
        return new Promise((resolve, reject) => {
            this.validValue(undefined, value).then(
                valid => {
                    this.createId(value).then(
                        (id) => {
                            this.arts.set(id, value);
                            resolve(id);
                        },
                        (error) => {
                            reject(new Error("Could not create new identifier", { cause: error }));
                        }
                    )
                },
                error => {
                    reject(error);
                }
            )
        });
    }

    update(id: string, value: Art): Promise<boolean> {

        return new Promise((resolve, reject) => {
            if (this.arts.has(id)) {
                this.validValue(id, value).then(
                    (valid) => {
                        this.arts.set(id, value);
                        resolve(true);
                    },
                    (error) => {
                        reject(new Error("Invalid value", { cause: error }));
                    }
                )
            } else {
                reject("Not found");
            }
        });
    }

    delete(id: string): Promise<boolean> {
        return Promise.resolve(this.arts.delete(id));
    }

}

export class HermeticArtDao extends ArtDao {

    static createDefault() {
        const arts : Art[] = [
            ...["Creo", "Intellego", "Muto", "Perdo", "Rego"].map(
                artName => (new Technique(artName))
            ), 
            ...["Animal", "Aquam", "Auram", "Corpus", "Herbam", 
                "Ignem", "Imaginem", "Mentem", "Terram", "Vim"
            ].map(
                artName => new Form(artName)
            )
        ];

        return new HermeticArtDao(arts);
    }

    constructor(entries : Art[] = []) {
        super(entries.filter( art => (art.style === "Hermetic")));
    }

    validValue(id:string|undefined, value:Art): Promise<boolean> {
        return super.validValue(id, value).then(
            (valid) => {
                return valid && (value.style === "Hermetic")
            }
        )
    }
}

var defaultDao = new ArtDao();

export default defaultDao;
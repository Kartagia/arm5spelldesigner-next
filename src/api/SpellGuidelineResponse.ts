
/**
 * The spell guidelines response.
 */

import { ArtKey, Level, Spell, SpellGuideline } from "@/data/spells";
import { BasicApiResponse } from "./ApiResponse";
import { GUID } from "@/data/guid";
import { CheckOptions } from "./ErrorResponse";
import { fetchArt } from "@/data/artData";
import { loadEnvFile } from "process";
import { UnsupportedError } from "@/data/utils";
import { validApiRouteKey } from "@/data/config_api";
import build from "next/dist/build";

/**
 * A reference to a value.
 */
export interface Reference {

    /**
     * The GUID of the reference.
     */
    guid: GUID;

    /**
     * The type of the reference.
     */
    type?: string;

    /**
     * The journal date string of the reference.
     */
    currentDate?: string;
}

export function validJournalDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function checkJournalDate(value: any, options: CheckOptions<string> = {}): string {
    const {message = "Invalid journal date"} = options;
    if (typeof value === "string") {
        if (validJournalDate(value)) {
            return value;
        } else {
            throw new SyntaxError(message);
        }
    } else {
        throw new SyntaxError(message);
    }
}

/**
 * Art reference requires type to be set.
 */
export interface ArtReference extends Reference {

    /**
     * The type of the reference.
     */
    type: "art.technique"|"art.form"
}

export interface ApiSpellGuideline {
    technique: GUID|ArtKey|ArtReference;
    form: GUID|ArtKey|ArtReference;
    title: string;
    level: Level;
    description?: string;
    temporary?: boolean;
}

export interface Builder<TYPE> {

    /**
     * Set property of a builder.
     * @param property The altered property.
     * @param value The value of the property.
     * @returns The new builder with given property set.
     * @throws {UnsupportedError} The given property is not supported.
     * @throws {SyntaxError} The property value was invalid.
     */
    assignProperty<VALUE extends TYPE[keyof TYPE]>(property: keyof TYPE, value: VALUE): Builder<TYPE>;

    /**
     * Is the builder state complete.
     * @return True, if and only if the builder may build.
     */
    isComplete(): boolean;

    /**
     * Builde the value.
     * @returns The build value.
     * @throws {SyntaxError} The current state does not allow building.
     */
    build():TYPE;
}

export class BasicBuilder<TYPE> implements Builder<TYPE> {

    private current : Partial<TYPE>;
    private _requiredKeys: readonly (string | number | symbol)[];

    protected setCurrent(newValue: Partial<TYPE>) {
        this.current = newValue;
    }

    constructor(base: Partial<TYPE>, requiredKeys: readonly (string|number|symbol)[] = []) {
        this._requiredKeys = requiredKeys;
        this.current = {...base};
    }

    get requiredKeys(): readonly (string|number|symbol)[] {
        return this._requiredKeys;
    }

    assignProperty<VALUE extends TYPE[keyof TYPE]>(property: keyof TYPE, value: VALUE):BasicBuilder<TYPE> {
        try {
            return this.builder( {...this.current, [property]:value}, this.requiredKeys);
        } catch(error) {
            throw new SyntaxError("Invalid property value", {cause: error});
        }
    }

    isComplete(): boolean {
        return this.requiredKeys.every( key => (key in this.current) );
    }

    build(): TYPE {
        if (this.isComplete()) {
            return {...this.current} as TYPE;
        }
        throw new SyntaxError("Incomplete builder");
    }

    /**
     * The current state of the builder.
     */
    public get currentState(): Partial<TYPE> {
        return this.current;
    }

    /**
     * Build a new builder. 
     * @param value The current state of the builder.
     * @param requiredKeys The required keys.
     * @returns The new builder created from the given values.
     */
    builder(value: Partial<TYPE>, requiredKeys: readonly (string|symbol|number)[]): BasicBuilder<TYPE> {
        return new BasicBuilder(value, requiredKeys);
    }
}

export class SpellGuidelineBuilder extends BasicBuilder<SpellGuideline> {

    static builder(base: Partial<SpellGuideline>, requiredProperties: (string|symbol|number)[] = ["title", "level", "technique", "form"]): Promise<SpellGuidelineBuilder> {
        return Promise.resolve(new SpellGuidelineBuilder(base, requiredProperties));
    }

    constructor(base: Partial<SpellGuideline>, requiredKeys: readonly (string|symbol|number)[] = ["title", "level", "technique", "form"]) {
        super(base, requiredKeys);
        if (base.form) {
            this.getArtKey(base.form).then( art => {this.assignProperty("form", art)});
        }
        if (base.technique) {
            this.getArtKey(base.technique).then( art => {this.assignProperty("technique", art)});
        }
        if (base.level) {
            this.assignProperty("level", base.level);
        }
        if (base.name) {
            this.assignProperty("name", base.name);
        }
        if (base.description) {
            this.assignProperty("description", base.description);
        }
    }

    /**
     * Get art key of the art value.
     * @param art The art value.
     * @returns The promise of the art key.
     */
    getArtKey( art: ArtKey|GUID|ArtReference): Promise<ArtKey> {
        if (art instanceof ArtKey) {
            return Promise.resolve(art);
        } else if (art instanceof GUID) {
            return fetchArt(art).then( value => (value.abbrev));
        } else {
            return fetchArt(art.guid).then( value => (value.abbrev));
        }
    }

    setTechnique( technique: ArtKey|GUID|ArtReference) : Promise<SpellGuidelineBuilder> {
        return new Promise( async (resolve, reject) => {
            this.getArtKey(technique).then( (art) => {
                resolve(this.assignProperty("technique", art));
            }, reject)
        });
    }

    setForm( form: ArtKey|GUID|ArtReference): Promise<SpellGuidelineBuilder> {
        return new Promise( async (resolve, reject) => {
            this.getArtKey(form).then( (art) => {
                this.assignProperty("form", art);
                resolve(this);
            }, reject)
        });
    }

    setLevel( level: Level ): Promise<SpellGuidelineBuilder> {
        try {
            return Promise.resolve(this.assignProperty("level", level));
        } catch (error) {
            return Promise.reject(new SyntaxError("Invalid new level", {cause: error}));
        }
    }

    setName( name: string ): Promise<SpellGuidelineBuilder> {

        try {
            return Promise.resolve(this.assignProperty("name", name));
        } catch (error) {
            return Promise.reject(new SyntaxError("Invalid new name", {cause: error}));
        }    
    }

    assignProperty<VALUE extends string | number | ArtKey | string[] | undefined>(property: keyof SpellGuideline, value: VALUE): SpellGuidelineBuilder {
        try {
            const result = super.assignProperty(property, value);
            return this.builder(result.currentState, this.requiredKeys);
        } catch(error) {
            throw new SyntaxError(`Invalid property value`, {cause: error});
        }

    }

    builder(value: Partial<SpellGuideline>, requiredKeys: readonly (string | symbol | number)[]): SpellGuidelineBuilder {
        return new SpellGuidelineBuilder(value, requiredKeys);
    }

}


export class SpellGuidelineResponse extends BasicApiResponse<ApiSpellGuideline> {

    /**
     * Create guidenline response from received JSON.
     * @param json The received JSON.
     * @returns The promsie of a spell guideline response.
     */
    static fromReceived( json: any ): Promise<SpellGuidelineResponse> {
        if (typeof json !== "object" || json === null || Array.isArray(json)) {
            return Promise.reject("Invalid json for received value");
        }
        try {
            return Promise.resolve( (new SpellGuidelineResponse(json as ApiSpellGuideline)) );
        } catch(error) {
            return Promise.reject(error);
        }
    }

    /**
     * Create a Spell Guideline Response from guideline.
     * @param guideline 
     * @param isTemporary 
     * @returns 
     */
    fromSpellGuideline(guideline: SpellGuideline, isTemporary: boolean = false): SpellGuidelineResponse {
        return new SpellGuidelineResponse( {
            title: guideline.name,
            level: guideline.level,
            technique: guideline.technique,
            form: guideline.form,
            description: guideline.description,
            temporary: isTemporary
        })
    }

    /**
     * Create a new spell guideline response from a ApiSpellGuideline.
     * @param value The api spell guideline.
     */
    constructor(value : ApiSpellGuideline
    ) {
        super(value, new Map([["application/json", (value: ApiSpellGuideline) => (JSON.stringify(value))]]));
    }

    toSpellGuideline(): Promise<SpellGuideline> {
        const value = this.getValue();
        var builder = SpellGuidelineBuilder.builder({}).then(
            (current) => (current.setLevel(value.level))
        ).then (
            (current) => (current.setName(value.title))
        ).then(
            (current) => (current.setTechnique(value.technique))
        ).then(
            (current) => (current.setForm(value.form))
        ).then(
            (current) => {
                return current.build();
            },
            (error) => {
                throw new SyntaxError("Invalid spell guideline", {cause: error});
            }
        );
        return builder;
    }
}
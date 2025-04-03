import { ArtKey, Spell, SpellGuideline } from "@/data/spells";
import { checkLevel } from "@/lib/level";
import { NextRequest, NextResponse } from "next/server";
import { EntryFilter, Identified, createIdentified, Predicate } from "@/data/utils";
import { Check } from "../../../../lib/utils";
import { CheckOptions } from "../../../../lib/utils";
import { AccessMethods } from "@/data/api_keys";
import { validApiKey, validApiReadKey, validApiRouteKey } from "@/data/config_api"
import ErrorResponse from "@/api/ErrorResponse";
import { GUID } from "@/data/guid";
import { ArtReference, validJournalDate } from "@/api/SpellGuidelineResponse";
import { promised } from "@/lib/utils";
import { fetchArt } from "@/data/artData";
import { TrueValidator } from "@/data/dao";
import Art from "@/data/arts";
/**
 * Test authentication satatus of the request.
 * @param request The tested request.
 * @returns True, if and only if the request is authenticated.
 * @todo Move to own library.
 */
export function isAuthenticated(request: NextRequest): boolean {
    const key = request.headers?.get("API-key");
    console.log(`Validating API key:${key}`);
    return key !== null && validApiKey(key);
}

var guidelines: Map<string, SpellGuideline> = new Map<string, SpellGuideline>(
    [[GUID.createV4().toString(), {name: "Give an animal +1 to Recovery rolls", form: new ArtKey("An"), technique: new ArtKey("Cr"), level: 1}]]
);

interface SpellGuidelineOptions {
    filter?: EntryFilter<SpellGuideline>;
}

class PredicateObject<TYPE> {
    private tester: (value: TYPE) => boolean;

    /**
     * Create a predicate object requiring all predicates passes.
     * @param predicates The predicates.
     * @returns The predicate object requiring tested passes all predicates.
     */
    static and<TYPE>(...predicates: PredicateObject<TYPE>[]): PredicateObject<TYPE> {
        return new PredicateObject((tested: TYPE) => (predicates.every(predicate => (predicate.test(tested)))));
    }

    /**
     * Create a predicate object requiring some predicates passes.
     * @param predicates The predicates.
     * @returns The predicate object requiring tested passes at least one of the predicates.
     */
    static or<TYPE>(...predicates: PredicateObject<TYPE>[]): PredicateObject<TYPE> {
        return new PredicateObject((tested: TYPE) => (predicates.some(predicate => (predicate.test(tested)))));
    }

    /**
     * Create a predicate requiring the predicate passes a specific number
     * of predicates.
     * @param count The number of matches required to pass. If the value is negative,
     * requires that many predicats to fail.
     * @param predicates The predicates.
     */
    static count<TYPE>(count: number, ...predicates: PredicateObject<TYPE>[]): PredicateObject<TYPE> {
        if (count > 0) {
            return new PredicateObject((tested: TYPE) => (
                predicates.reduce((result, predicate) => (result + (predicate.test(tested) ? 1 : 0)), 0) >= count
            ));
        } else if (count < 0) {
            return new PredicateObject((tested: TYPE) => (
                predicates.reduce((result, predicate) => (result + (predicate.test(tested) ? 0 : -1)), 0) <= count
            ));
        } else {
            // Any value passes zero predicates.
            return new PredicateObject();
        }
    }


    constructor(tester: (value: TYPE) => boolean = (() => true)) {
        this.tester = tester;
    }

    /**
     * Test value.
     * @param value The tested value.
     * @returns True, if and only if the value passes the predicate.
     */
    test(value: TYPE): boolean {
        return this.tester(value);
    }

    /**
     * Create combined predicate requiring both this and others pass.
     * @param others The other testers.  
     * @returns The predicate combining the predicate with others.
     */
    and(...others: PredicateObject<TYPE>[]): PredicateObject<TYPE> {
        return new PredicateObject((tested) => (this.test(tested) && others.every((other => other.test(tested)))));
    }

    /**
     * Create combined predicate requiring either this or any of others pass.
     * @param others The other testers.  
     * @returns The predicate combining the predicate with others.
     */
    or(...others: PredicateObject<TYPE>[]): PredicateObject<TYPE> {
        return new PredicateObject((tested) => (this.test(tested) ||
            others.some(other => other.test(tested))));
    }

    /**
     * The complementing predicate. 
     * @returns The complementing predicate passing when this predicate fails.
     */
    complement(): PredicateObject<TYPE> {
        return new PredicateObject((tested) => (!this.test(tested)));
    }
}

/**
 * The filter of spell guideline entries.
 */
class SpellGuidelineFilter {

    /**
     * Adds additional guideline filter. The additional guideline filter
     * must past along with the current filter. 
     * @param filter The added additional filter function or predicate object.
     */
    addAdditionalGuidelineFilter(filter: ((guideline: SpellGuideline) => boolean) | (PredicateObject<SpellGuideline>)) {
        if (typeof filter === "function") {
            this.valuePredicate = this.valuePredicate.and(new PredicateObject(filter));
        } else {
            this.valuePredicate = this.valuePredicate.and(filter);
        }
    }

    /**
     * Adds additional identifier filter. The additional identifier filter
     * must past along with the current filter.
     * @param filter The added additional filter function or predicate object.
     */
    addAdditionalIdentifierFilter(filter: ((id: string) => boolean) | PredicateObject<string>) {
        if (typeof filter === "function") {
            this.idPredicate = this.idPredicate.and(new PredicateObject(filter));
        } else {
            this.idPredicate = this.idPredicate.and(filter);
        }
    }


    /**
     * Adds alternate guideline filter. Either the current filter or alternate
     * filter must pass.
     * @param filter The added alternate filter function or predicate object.
     */
    addAlternateGuidelineFilter(filter: ((guideline: SpellGuideline) => boolean) | (PredicateObject<SpellGuideline>)) {
        if (typeof filter === "function") {
            this.valuePredicate = this.valuePredicate.or(new PredicateObject(filter));
        } else {
            this.valuePredicate = this.valuePredicate.or(filter);
        }
    }

    /**
     * Adds alternate identifier filter. Either the current filter or alternate
     * filter must pass.
     * @param filter The added alternate filter function or predicate object.
     */
    addAlternateIdentifierFilter(filter: ((id: string) => boolean) | PredicateObject<string>) {
        if (typeof filter === "function") {
            this.idPredicate = this.idPredicate.or(new PredicateObject(filter));
        } else {
            this.idPredicate = this.idPredicate.or(filter);
        }
    }

    /**
     * The identifier testing predicate object.
     */
    idPredicate: PredicateObject<string> = new PredicateObject<string>();

    /**
     * The guideline testing predicate object.
     */
    valuePredicate: PredicateObject<SpellGuideline> = new PredicateObject();

    constructor() {

    }

    /**
     * Get the guideline filter testing the guideline DAO entry.
     * @returns The entry filter testing the guideline entry.
     */
    getFilter(): EntryFilter<SpellGuideline> {
        return (id: string, value: SpellGuideline) => {
            return this.idPredicate.test(id) && this.valuePredicate.test(value);
        }
    }

    /**
     * Get the predicate testing a guideline.
     * @returns The predicate testing guidelines.
     */
    getGuidelineFilter(): Predicate<SpellGuideline> {
        return (tested: SpellGuideline) => this.valuePredicate.test(tested);
    }

    /**
     * Get the predicate testing an identifier.
     * @returns The predicate testing an identifier.
     */
    getIdentifierFilter(): Predicate<string> {
        return (tested: string) => this.idPredicate.test(tested);
    }
}


function checkTitle(value: any, options: CheckOptions<string> = {}): string {
    const { message = "Invalid title" } = options;
    var match;
    if (typeof value === "string" && /^[A-Z+-](?:[\w+-])*?(?:,?\s[\w+-]*)*\.(?:$|\s*?)$/.test(value)) {
        return value.trim();
    } else {
        throw new SyntaxError(message);
    }
}

function checkDescription(value: any, options: CheckOptions<string> = {}): string | undefined {
    const { message = "Invalid description" } = options;
    if (["string", "undefined"].some(type => (typeof value === type))) {
        return value;
    } else {
        throw new SyntaxError(message);
    }
}

export interface ArtCheckOptions {
    /**
     * The expected style.
     */
    style?: string;

    /**
     * The expected type.
     */
    type?: string;
}

function checkArt(value: any, options: CheckOptions<ArtKey> & ArtCheckOptions = {}): ArtKey {
    const { message = "Invalid art" } = options;
    const filter = (art: Art) => {
        if (options.style !== undefined && art.style !== options.style) {
            return false;
        } else if (options.type !== undefined && art.type !== options.type) {
            return false;
        }
        return true;
    }
    if (typeof value === "object") {
        const refProps: [string, (value: any) => boolean][] = [
            ["type", (value: any) => (typeof value === "string" && ["technique", "form"].some(valid => (valid === value)))],
            ["guid", (value: any) => (typeof value === "string" && GUID.GUIDRegex().test(value))],
            ["currentDate", (value: any) => (typeof value === "string" && validJournalDate(value))]
        ];
        if (refProps.every(([prop, validator]) => (prop in value && validator(value[prop])))) {
            // The value is reference.
            const result = promised(fetchArt(value).then((art) => {
                if (filter(art)) {
                    return art.abbrev;
                } else {
                    undefined;
                }
            }))
            if (result) {
                return result;
            } else {
                throw new SyntaxError(message);
            }
        } else {
            throw new SyntaxError(message);
        }
    } else if (typeof value === "string") {
        if (GUID.GUIDRegex().test(value)) {
            // We did get GUID.
            const result = promised(fetchArt(value).then((art) => {
                if (filter(art)) {
                    return art.abbrev;
                } else {
                    return undefined;
                }
            }));
            if (result) {
                return result;
            } else {
                throw new SyntaxError(message);
            }
        } else {
            // We do have art or art reference.
            const result = promised(fetchArt(value).then((art) => (art.abbrev)));
            if (result) {
                return result;
            } else {
                throw new SyntaxError(message);
            }
        }
    }

    throw new SyntaxError(message);
}

/**
 * Parse JSON guideline.
 * @param jsonBody The JSON body.
 * @returns The promise of a parsed spell guideline.
 * @throws {SyntaxError} The rejected json body did not contain a valid promise.
 */
async function parseJsonGuideline(jsonBody: any): Promise<SpellGuideline> {

    if (typeof jsonBody === "object") {

        return {
            name: checkTitle(jsonBody.title),
            description: checkDescription(jsonBody.description),
            level: checkLevel(jsonBody.level),
            technique: checkArt(jsonBody.technique, { type: "technique" }),
            form: checkArt(jsonBody.form, { type: "form" })
        };
    } else {
        throw new SyntaxError("Invalid json body for a guideline");
    }
}

/**
 * Parse a JSON requuest
 * @param jsonBody The jason request.
 * @returns The promise of the spell guideline options from request.
 */
async function parseJsonRequest(jsonBody: any): Promise<SpellGuidelineOptions> {
    switch (typeof jsonBody) {
        case "object":
            if (Array.isArray(jsonBody)) {
                // Array of request options.
                return {};
            } else {
                // Parse POJO.
                const filter = new SpellGuidelineFilter();
                if (jsonBody.technique) {
                    if (Array.isArray(jsonBody.technique)) {
                        const techFilter = PredicateObject.or<SpellGuideline>(jsonBody.techinique.map(
                            (expected: any) => (new PredicateObject<SpellGuideline>(
                                (tested) => (tested.technique.toString() === expected.toString())
                            ))
                        ))
                        filter.addAdditionalGuidelineFilter(techFilter)
                    } else {
                        filter.addAdditionalGuidelineFilter(
                            guideline => (guideline.technique?.toString() === jsonBody.technique?.toString()))
                    }
                }
                if (jsonBody.form) {
                    if (Array.isArray(jsonBody.form)) {
                        const techFilter = PredicateObject.or<SpellGuideline>(jsonBody.form.map(
                            (expected: any) => (new PredicateObject<SpellGuideline>(
                                (tested) => (tested.form.toString() === expected.toString())
                            ))
                        ))
                        filter.addAdditionalGuidelineFilter(techFilter)
                    } else {
                        filter.addAdditionalGuidelineFilter(
                            guideline => (guideline.form.toString() === jsonBody.form?.toString()))
                    }
                }
                if (jsonBody.level) {
                    filter.addAdditionalGuidelineFilter(
                        guideline => (guideline.level.toString() === jsonBody.level?.toString()))

                }
                if (jsonBody.minLevel) {
                    const minLevel = Number(jsonBody.minLevel);
                    if (Number.isSafeInteger(minLevel)) {
                        filter.addAdditionalGuidelineFilter(
                            guideline => (guideline.level === "Generic" || guideline.level >= minLevel)
                        )
                    } else {
                        throw new SyntaxError("Invalid minimum level");
                    }
                }
                if (jsonBody.maxLevel) {
                    const maxLevel = Number(jsonBody.maxLevel);
                    if (Number.isSafeInteger(maxLevel)) {
                        filter.addAdditionalGuidelineFilter(
                            guideline => (guideline.level === "Generic" || guideline.level <= maxLevel)
                        )
                    } else {
                        throw new SyntaxError("Invalid maximum level");
                    }
                }
                return {
                    filter: filter.getFilter()
                }
            }
        default:
            // Unknown requst.
            return {};
    }
}

/**
 * Does the request have access to the route.
 * @param request The request.
 * @param route The security access route. 
 * @returns True, if and only if the request is allowed for the route.
 */
export function canAccess(request: NextRequest, route: string = "/spellguidelines"): boolean {
    var method: AccessMethods = "GET";
    var apiKey: string | null = null;
    switch (request.method) {
        case "POST":
            method = "CREATE";
        case "PUT":
            if (method === "GET") {
                method = "UPDATE";
            }
        case "PATCH":
            if (method === "GET") {
                method = "UPDATE";
            }
        case "DELETE":
            if (method === "GET") {
                method = "DELETE";
            }
            apiKey = request.cookies.get("API-key")?.value || null;
            return apiKey !== null && validApiRouteKey(apiKey, route, method);
        default:
            // These are equiavlent to GET
            apiKey = request.headers.get("API-key");
            return apiKey !== null && validApiRouteKey(apiKey, route, method);
    }
}

/**
 * Create entry filter.
 * @param request The request.
 * @returns The promise of the entry filter.
 * @throws {ErrorResponse} The rejected error response describing the erroneous request.
 */
async function createEntryFilter(request: NextRequest): Promise<EntryFilter<SpellGuideline, string>> {
    var filter: EntryFilter<SpellGuideline, string> = () => true;
    try {
        // Get does not have content
        switch (request.headers.get("Content-Type")) {
            case "application/json":
                // Handle the JSON parameters. 
                ({ filter = filter } = (await parseJsonRequest(await request.json())));
                break;
            default:
                // Unknown content type.
                const msg = `Invalid request content type`;
                return Promise.reject(new ErrorResponse({ message: msg, errorCode: "400" }));
        }
    } catch (error) {
        const message = (typeof error === "string" ? error :
            (error instanceof Error ? error.message : "Invalid request"));
        return Promise.reject(new ErrorResponse({ message, errorCode: "400" }));
    }
    return filter;
}

/**
 * Create a new guideline.
 * @param request 
 */
export async function POST(request: NextRequest) {

    if (!isAuthenticated(request)) {
        const msg = "Access denied"
        const errorMsg = new ErrorResponse({ message: msg, errorCode: "401" });
        const result = Response.json(errorMsg);
        //const result = Response.json({ message: msg }, { status: 401, statusText: msg });
        return result;
    } else if (!canAccess(request)) {
        const msg = "Access denied"
        //const result = Response.json({ message: msg }, { status: 403, statusText: msg });
        const result = Response.json(new ErrorResponse({ message: msg, errorCode: "403" }));
        return result;
    }

    // Parsing the body.
    try {
        /**
         * @todo: Replace with call to acquire a guid.
         */
        const guid = GUID.createV4();

        const guideline: SpellGuideline = await request.json().then(
            source => (parseJsonGuideline(source))
        );
        guidelines.set(guid.toString(), guideline);
        return Response.json(guid);
    } catch (err) {
        if (err instanceof ErrorResponse) {
            return Response.json(ErrorResponse, { status: Number(err.errorCode) })
        }
        return Response.json(new ErrorResponse({ message: "Invalid guideline", errorCode: "400" }), { status: 400 });
    }
}

/**
 * Get filtered guideline entries.
 * @param request The request.
 * @returns The promise of Identified entries passing the filter.
 */
export async function getFilteredGuidelines(request: NextRequest) {
    if (!isAuthenticated(request)) {
        const msg = "Access denied"
        const errorMsg = new ErrorResponse({ message: msg, errorCode: "401" });
        const result = Response.json(errorMsg);
        //const result = Response.json({ message: msg }, { status: 401, statusText: msg });
        return result;
    } else if (!canAccess(request)) {
        const msg = "Access denied"
        //const result = Response.json({ message: msg }, { status: 403, statusText: msg });
        const result = Response.json(new ErrorResponse({ message: msg, errorCode: "403" }));
        return result;
    }


    try {
        const filter = await createEntryFilter(request);

        const result: Identified<SpellGuideline>[] = [];
        for (const [key, guideline] of guidelines.entries()) {
            if (filter(key, guideline)) {
                result.push(createIdentified(key, guideline));
            }
        }


        switch (request.headers.get("Accept")) {
            case "application/json":
                return NextResponse.json<Identified<SpellGuideline, string>[]>(result);
            default:
                return NextResponse.error();
        }
    } catch (err) {
        if (err instanceof ErrorResponse && ["message", "status"].every(prop => prop in err)) {
            return NextResponse.json(err);
        } else {
            throw err;
        }
    }

}

/**
 * Get all spell guidelines.
 * @param request The request.
 * @returns The response containing all spell guidelines fulfilling
 * the request.
 */
export async function GET(request: NextRequest) {

    if (!isAuthenticated(request)) {
        const msg = "Access denied"
        const result = Response.json({ message: msg }, { status: 401, statusText: msg });
        return result;
    } else if (!canAccess(request)) {
        const msg = "Access denied"
        const result = Response.json({ message: msg }, { status: 403, statusText: msg });
        return result;
    }

    var filter: EntryFilter<SpellGuideline, string> = () => true;


    const result: Identified<SpellGuideline>[] = [];
    for (const [key, guideline] of guidelines.entries()) {
        result.push(createIdentified(key, guideline));
    }


    switch (request.headers.get("Accept")) {
        case "application/json":
            return NextResponse.json<Identified<SpellGuideline, string>[]>(result);
        default:
            return NextResponse.error();
    }

}


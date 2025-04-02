import { ArtKey, Spell, SpellGuideline } from "@/data/spells";
import { NextRequest, NextResponse } from "next/server";
import { EntryFilter, Identified, createIdentified, Predicate } from "@/data/utils";
import { AccessMethods } from "@/data/api_keys";
import { validApiKey, validApiReadKey, validApiRouteKey } from "@/data/config_api"
import { GUID } from "@/data/guid";
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
    var method: AccessMethods= "GET";
    var apiKey: string|null = null;
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
 * Get filtered guidelines.
 * @param request 
 */
export async function POST(request: NextRequest) {

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
                return NextResponse.json({ message: msg }, { status: 400 });
        }
    } catch (error) {
        const message = (typeof error === "string" ? error :
            (error instanceof Error ? error.message : "Invalid request"))
        return NextResponse.json({ message: message }, { status: 400 });
    }

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

/**
 * Test alteration request acceptance.
 * @param request The request.
 * @returns True, if and only if the user has right to alter the data.
 */
function isAuthorizedToAlter(request: NextRequest): boolean {
    const apiKey = request.cookies.get("API-key");
    return (process.env.DATA_API_KEY !== undefined && process.env.DATA_API_KEY === apiKey?.value);
}

/**
 * Handling storing spell guidelines.
 * @param request The request. 
 */
export async function PUT(request: NextRequest) {
    if (!isAuthorizedToAlter(request)) {
        const msg = "Access denied"
        const result = Response.json({ message: msg }, { status: 403, statusText: msg });
        return result;
    }
}
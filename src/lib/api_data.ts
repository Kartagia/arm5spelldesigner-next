
/**
 * A reference type.
 */

import { UUID } from "crypto";
import { Permissions, validateApiRequest } from "./api_auth";
import pino from "pino";
import { getAPIConnection, safeRelease } from "./api_db";
import { checkUUID } from "./modifiers";
import { Client, PoolClient, QueryConfig, QueryResult, QueryResultRow } from "pg";
import { join } from "path";

/**
 * The reference type of the journal references.
 */
export type RefType = string & { __ref: "Journal"; };/**
 * Regular expression matching to a valid refernece type.
 * @returns Regeular expression matching with a valid reference type.
 */

/**
 * A regular expression validating a journal reference type.
 * @returns REgular expression matching to a valid journal reference type.
 */
export function RefTypeRegex(): RegExp {
    return /^(?:\w+)(?:\.\w+)*$/;
}

/**
 * Create a new reference type.
 * @param value The base value.
 * @returns The reference type derived from teh value.
 * @throws {SyntaxError} The source could not be converted into reference type.
 */
export function RefType(value: any): RefType {
    const message = "Invalid reference type";
    if (typeof value === "string" && RefTypeRegex().test(value)) {
        return value as RefType;
    } else {
        throw new SyntaxError(message);
    }
}
/**
 * Convert a value into UTC date.
 * @param value The base value.
 * @returns The valid utcdate  derived from the value.
 * @throws {SyntaxError} The source could not be converted into UTCDate.
 */
export function UTCDate(value: string): UTCDate {
    const message = "Invalid UTC date";
    if (typeof value === "string" && UTCDateRegex().test(value)) {
        return value as UTCDate;
    } else {
        throw new SyntaxError(message);
    }
}
/**
 * Api representation of are refernce type.
 */
export interface JournalId<TYPE extends string> {
    /**
     * The referenced UUID.
     */
    guid: UUID;
    /**
     * The type of hte referenced value.
     */
    refType?: TYPE;

    /**
     * The journal moment when the UUID is valid.
     */
    startTime?: UTCDate;
}
/**
 * Api representation of are refernce type.
 */
interface Reference<TYPE extends string> {
    /**
     * The referenced UUID.
     */
    guid: UUID;
    /**
     * The type of hte referenced value.
     */
    refType?: TYPE;

    /**
     * The time of the refence.
     */
    refTime?: UTCDate;
}
/**
 * The Api representation of an art.
 */
export interface ApiArt {
    guid?: UUID;
    type: "Form" | "Technique";
    abbrev: string;
    name: string;
    style: string;
}
/**
 * Create UTCDateRegex matching to a valid UTC date.
 * @param capture Does the regex capture year, month of year, and day of month into
 * unnamed groups.
 * @returns The regular expression matching to a string containing only an UTC date.
 */
export function UTCDateRegex(capture: boolean = false): RegExp {
    if (capture) {
        return /^([+-]\d{6}|\d4)\-(0\d|1[0-2])\-([0-2]\d|3[01])$/;
    } else {
        return /^(?:[+-]\d{6}|\d4)\-(?:0\d|1[0-2])\-(?:[0-2]\d|3[01])$/;
    }
}
/**
 * The type of UTC data.
 */
export type UTCDate = string & { __date: "UTC"; };

/**
 * Create an unauthrorized reply.
 * @param message The message of the reply.
 * @param errorCode The error code of the unauthorized reply. 
 * - 401 indicates the identity of the user is not known.
 * - 403 indicates the user has to relogin. 
 * @returns The API reply.
 */
export function UnauthorizedReply(message?: string, errorCode: 401 | 403 = 401) {
    return Response.json({ message: "Access denied. Please login to acquire credentials.", errorCode });
}

/**
 * Create an error reply.
 * @param errorCode The error cod.e
 * @param message The message of the reply.
 * @returns The error reply. 
 */
export function ErrorReply(errorCode: number = 400, message?: string) {
    if (errorCode < 400) {
        throw new SyntaxError("The result is not an error");
    }
    return Response.json({ message, errorCode }, { status: errorCode });
}
/**
 * Create a not-found reply.
 * @param guid The optional guid of the missing value.
 * @param refType The optional reference type of the missing value.
 * @param message The message of the missing value. @default "Not found!" 
 * @returns The not-found reply. 
 */
function NotFoundReply(guid?: UUID, refType?: string, message: string = "Not found!") {

    return Response.json({ guid, refType, message, errorCode: 404 }, { status: 404 });
}

/**
 * Error content.
 */
export interface ErrorContent<MESSAGE extends string=string, CODE extends number=number> {
    /**
     * The message of the error.
     */
    message?: MESSAGE;

    /**
     * The error code.
     */
    errorCode?: CODE;
}

export type InvalidResourceEntry = { propertyName: string; message?: string; };

/**
 * THe invalid resource content. 
 */
export interface InvalidResourceContent extends ErrorContent {
    invalidProrties: InvalidResourceEntry[];
}

/**
 * The guid content.
 */
export interface GuidContent {
    guid: UUID;
}

/**
 * Resource content.
 */
export interface ResourceContent<TYPE> extends GuidContent {
    guid: UUID;
    value: TYPE;
}
/**
 * Reply indiating teh resource was invalid.
 * @param invalidProperties The invalid proerties.
 * @param guid The guild, of the invalid resource.
 * @returns The invalid resource reply.
 */
export function InvalidResourceReply(propertyName: string, invalidProperties: Record<string, string | string[]>, guid?: UUID) {

    return Response.json({
        message: "Invalid " + propertyName, invalidProperties: Object.getOwnPropertyNames(invalidProperties).flatMap(
            (propertyName) => (Array.isArray(invalidProperties[propertyName]) ? invalidProperties[propertyName].map(
                (message) => ({ propertyName, message })
            ) : { propertyName, message: invalidProperties[propertyName] })
        ), guid
    }, { status: 400 });
}
/**
 * Create GUID reply
 * @param guid The GUID returned to the caller.
 * @returns The GUID reply. 
 */
function CreateGuidReply(guid: UUID) {
    return Response.json(guid);
}

/**
 * The API priviledges structure. 
 * The defaults are for required privileges.
 */
export interface ApiPrivileges {
    /**
     * The privilege to get an existing resource.
     * @default true
     */
    read?: boolean;

    /**
     * The privilege to change existing resource.
     * @default false
     */
    alter?: boolean;

    /**
     * The privilege to create a new resource.
     * @default false
     */
    create?: boolean;

    /**
     * The privilege to remove existing resource.
     * @default false
     */
    remove?: boolean;
}

/**
 * Does the priivledges contain read permission.
 * @param privileges The tested privileges.
 * @returns True, if and only if the privileged structure 
 * has read permisison.
 */
export function hasReadPrivilege(privileges: Permissions) {
    return privileges.apiKey || privileges.cookieKey;
}

/**
 * Does the priivledges contain read permission.
 * @param privileges The tested privileges.
 * @returns True, if and only if the privileged structure 
 * has read permisison.
 */
export function hasAlterPrivilege(privileges: Permissions) {
    return privileges.cookieKey;
}

/**
 * Does the priivledges contain read permission.
 * @param privileges The tested privileges.
 * @returns True, if and only if the privileged structure 
 * has read permisison.
 */
export function hasCreatePrivilege(privileges: Permissions) {
    return privileges.cookieKey;
}

/**
 * Does the priivledges contain read permission.
 * @param privileges The tested privileges.
 * @returns True, if and only if the privileged structure 
 * has read permisison.
 */
export function hasRemovePrivilege(privileges: Permissions) {
    return privileges.cookieKey;
}

/**
 * Convert the first letter of the word into upper case. 
 * @param source The source string.
 * @returns The sorce with first letter converted to upper case.
 */
export function lcFirst(source: string): string {
    const word = source.split(/(\p{L})/u);
    if (word.length > 2) {
        word[1] = word[1].toUpperCase();
    }
    return word.join("");
}

/**
 * A database task possibly relying on information provided by the request.
 */
export type DatabaseTask<TYPE> = (dbh: Client|PoolClient, request?: Request) => Promise<[TYPE, Headers?]>|[TYPE, Headers?];

/**
 * Get resource of type. 
 * @param request The request. 
 * @param task The task performing the database operation. The task is only executed, if both user has required  priviledges, 
 * and the database connection was established.
 * @param resourceName The resource name. Used for logging.
 * @param requiredPrivileges The privileges required for the task.
 * @param logger The logger. 
 * @returns The promise of the response for the resource request. 
 */
export async function getResource<TYPE=any>(request: Request, task: DatabaseTask<TYPE>, resourceName: string, 
    requiredPrivileges?: ApiPrivileges, logger?:pino.BaseLogger): Promise<Response> {
    const privileges = await validateApiRequest(request);
        if ( hasReadPrivilege(privileges) ) {
            // Authentication passed. 
            logger?.debug("User authenticated. Loading data...");
            return getAPIConnection()
            .then(async dbh => {
                logger?.debug("Connection established");
                const [result, headers] =  await task(dbh, request);
                safeRelease(dbh);
                return Response.json(await result, {status: 200, headers});
            }).catch(
                (error) => {
                    if (error instanceof Response) {
                        return error;
                    }
                    return ErrorReply(503, `${lcFirst(resourceName)} API unavailable`);
                }
            );
        } else {
            return Response.json({ message: "Authentication required", code: 401 }, { status: 401 });
        }
}

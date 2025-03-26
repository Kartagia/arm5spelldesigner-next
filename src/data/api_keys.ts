/**
 * The module of API-keys.
 * @module ApiKeys 
 */

import { randomUUID } from "crypto";
import { GUID } from "./guid";
import { NotFoundError } from "@/api/NotFoundResponse";
import { permission } from "process";

/**
 * The API key configuration. 
 */
export interface ApiKeyStorage {
    /**
     * The API keys. 
     */
    apiKeys: readonly string[];

    /**
     * The root user keys.
     */
    rootKeys: readonly string[];

    /**
     * Add a api key to the storage.
     * @param apiKey The added api key.
     * @throws {Error} The key was invalid.
     * @returns The api key storage with api key added. 
     */
    addApiKey(apiKey: string): ApiKeyStorage;

    /**
     * Add a root access api key to the storage.
     * If the API key does not exist in the api keys, it is added to the api keys.
     * @param apiKey The added api key.
     * @throws {Error} The key was invalid.
     * @returns The api key storage with root acccess api key added. 
     */
    addRootApiKey(apiKey: string): ApiKeyStorage;

    /**
     * Add get access to the root route.
     * @param apiKey The Api key. 
     * @throws {Error} The access adding was not possible.
     * @returns The api key storage with api key added to the root route get method keys. 
     * @throws {NotFoundError} The API key is not a valid api key.
     */
    addAccess(apiKey: string): ApiKeyStorage;

    /**
     * Add get access to a route.
     * @param apiKey The Api key. 
     * @param route The route.
     * @returns The api key storage with api key added to the route get method keys. 
     * @throws {NotFoundError} The API key is not a valid api key.
     */
    addAccess(apiKey: string, route: string): ApiKeyStorage;

    /**
     * Add access to methods of route to api key.
     * @param apiKey The Api key.
     * @param route The route. @default "/"
     * @param methods The methods given with access. 
     * @returns The api key storage with api key added to the method keys of the route. 
     * @throws {NotFoundError} The API key is not a valid api key.
     */
    addAccess(apiKey: string, route: string | undefined, ...methods: AccessMethods[]): ApiKeyStorage;

    /**
     * Revoke access to methods of route from api key.
     * @param apiKey The Api key.
     * @param route The route. @default "/"
     * @param methods The methods whose access is removed. 
     * @returns The api key storage with api key removed from the keys accessible with route.
     */
    revokeAccess(apiKey: string, route: string | undefined, ...methods: AccessMethods[]): ApiKeyStorage;

    /**
     * The defualt access, if one is available. 
     */
    defaultAccess?: () => ApiKeyPermission;
}

/**
 * Generate a new API key.
 */
export function generateKey(dataStorage: ApiKeyStorage): string {
    const baseValue = GUID.fromString(randomUUID(), {});
    return baseValue.value.toString(36);
}
/**
 * The acces methods.
 */

export type AccessMethods = "GET" | "UPDATE" | "CREATE" | "DELETE" | "ALL";/**
 * The API key perssion determines permission for api keys.
 */

export interface ApiKeyPermission {
    /**
     * The API keys allowed to do all operations for the route.
     */
    ALL: readonly string[];
    /**
     * The API keys allowed to get existing resources.
     */
    GET: readonly string[];
    /**
     * The API keys allowed to update existing resources.
     */
    UPDATE: readonly string[];
    /**
     * The API keys allowed to delete existing resources.
     */
    DELETE: readonly string[];
    /**
     * The API keys allowed to create new resources.
     */
    CREATE: readonly string[];
}

/**
 * The access methods. 
 */
export const AccessMethodList : readonly AccessMethods[] = Object.freeze(["ALL", "GET", "CREATE", "DELETE", "UPDATE"]);

/**
 * Basic API permission implementation.
 * The basic permission implementation implements inherited permissions from parent permissions altered
 * by the permission allowed and denied mappings.
 */
export class BasicApiKeyPermission implements ApiKeyPermission {

    /**
     * Create basic api key permission from permissions and parent permissions.
     * @param permissions The permissions.
     * @param parent The optional parent permission.
     * @returns The basic api key permissions derived from parent and permissions. If parent is undefined,
     * the permissions are allowed permissions of the result. 
     */
    static from(permissions: ApiKeyPermission, parent: ApiKeyPermission|undefined=undefined): BasicApiKeyPermission {
        if (parent) {
            const allowed = new Map<AccessMethods, string[]>();
            const denied = new Map<AccessMethods, string[]>();
            AccessMethodList.forEach( method => {
                allowed.set(method, permissions[method].filter( (cursor) => (!parent[method].includes(cursor))));
                denied.set(method, parent[method].filter( (cursor) => (!permissions[method].includes(cursor))));
            });
            return new BasicApiKeyPermission( allowed, denied, parent);
        } else {
            return new BasicApiKeyPermission( AccessMethodList.map(
                (method) => ([method, (permissions[method] ?? ([] as string[]))])
            ) as [AccessMethods, readonly string[]][], []);
        }
    }

    /**
     * The private parent of the permissions.
     */
    private myParent : ApiKeyPermission | undefined = undefined;

    /**
     * The map from methods to access keys, which have been given allowed status.
     */
    private allowed: Map<AccessMethods, string[]>;

    /**
     * The map from methods to access keys, whose permission has been revoked.
     */
    private denied : Map<AccessMethods, string[]>;

    constructor(allowed: Iterable<[AccessMethods, readonly string[]]>, denied: Iterable<[AccessMethods, readonly string[]]>, parent: ApiKeyPermission|undefined = undefined) {
        this.myParent = parent;
        this.allowed = new Map([...allowed].map( ([method, keys]) => ([method, [...keys] as string[]]) ));
        this.denied = new Map([...denied].map( ([method, keys]) => ([method, [...keys] as string[]]) ));
    }

    get ALL() {
        const method = "ALL";
        const rejected = (this.denied.get(method) ?? []);
        const allowed =  (this.allowed.get(method) ?? []).filter( key => (!rejected.includes(key)));
        if (this.isRoot) {
            return allowed;
        } else {
            return ([...((this.parent?.[method] ?? []).filter( key => (!(allowed.includes(key) || rejected.includes(key))))), ...allowed]);
        }
    }

    get GET() {
        const method = "GET";
        const rejected = [...(this.denied.get(method) ?? []), ...(this.denied.get("ALL") ?? [])];
        const allowed =  (this.allowed.get(method) ?? []).filter( key => (!rejected.includes(key)));
        if (this.isRoot) {
            return allowed;
        } else {
            return ([...((this.parent?.[method] ?? []).filter( key => (!(allowed.includes(key) || rejected.includes(key))))), ...allowed]);
        }
    }

    get UPDATE() {
        const method = "UPDATE";
        const rejected = [...(this.denied.get(method) ?? []), ...(this.denied.get("ALL") ?? [])];
        const allowed =  (this.allowed.get(method) ?? []).filter( key => (!rejected.includes(key)));
        if (this.isRoot) {
            return allowed;
        } else {
            return ([...((this.parent?.[method] ?? []).filter( key => (!(allowed.includes(key) || rejected.includes(key))))), ...allowed]);
        }
    }

    get CREATE() {
        const method = "CREATE";
        const rejected = [...(this.denied.get(method) ?? []), ...(this.denied.get("ALL") ?? [])];
        const allowed =  (this.allowed.get(method) ?? []).filter( key => (!rejected.includes(key)));
        if (this.isRoot) {
            return allowed;
        } else {
            return ([...((this.parent?.[method] ?? []).filter( key => (!(allowed.includes(key) || rejected.includes(key))))), ...allowed]);
        }
    }

    get DELETE() {
        const method = "DELETE";
        const rejected = [...(this.denied.get(method) ?? []), ...(this.denied.get("ALL") ?? [])];
        const allowed =  (this.allowed.get(method) ?? []).filter( key => (!rejected.includes(key)));
        if (this.isRoot) {
            return allowed;
        } else {
            return ([...((this.parent?.[method] ?? []).filter( key => (!(allowed.includes(key) || rejected.includes(key))))), ...allowed]);
        }
    }
 
    /**
     * Is the curretn permission root permission.
     */
    get isRoot() {
        return this.parent === undefined;
    }

    /**
     * The parent permission. 
     */
    get parent() {
        return this.myParent;
    }

    toJSON() {
        return JSON.stringify({
            GET: this.GET,
            ALL: this.ALL,
            UPDATE: this.UPDATE,
            DELETE: this.DELETE,
            CREATE: this.CREATE
        })
    }

    /**
     * Add access for methods.
     * @param apiKey The api key.
     * @param methods The methods affected.
     * @returns The basic api key permissions with granted permissions.
     */
    addAccess(apiKey: string, ...methods: AccessMethods[]): BasicApiKeyPermission {
        AccessMethodList.filter( method => (methods.includes(method))).forEach(
            method => {
                var target = this.allowed.get(method);
                if (!target?.includes(apiKey)) {
                    // The api key does not exist.
                    if (target) {
                        this.allowed.set(method, [...target, apiKey]);
                    } else {
                        this.allowed.set(method, [apiKey]);
                    }
                }
                target = this.denied.get(method);
                if (target?.includes(apiKey)) {
                    this.allowed.set(method, target.filter( cursor => (cursor !== apiKey)));
                }
            }
        )
        return this;
    }

    /**
     * Remove access from methods.
     * @param apiKey The api key.
     * @param methods The methods affected.
     * @returns The basic api key permissions with permissions removed.
     */
    removeAccess(apiKey: string, ...methods: AccessMethods[]): BasicApiKeyPermission {
        AccessMethodList.filter( method => (methods.includes(method))).forEach(
            method => {
                var target = this.denied.get(method);
                if (!target?.includes(apiKey)) {
                    // The api key does not exist.
                    if (target) {
                        this.allowed.set(method, [...target, apiKey]);
                    } else {
                        this.allowed.set(method, [apiKey]);
                    }
                }
                target = this.allowed.get(method);
                if (target?.includes(apiKey)) {
                    this.allowed.set(method, target.filter( cursor => (cursor !== apiKey)));
                }
            }
        )
        return this;

    }
}


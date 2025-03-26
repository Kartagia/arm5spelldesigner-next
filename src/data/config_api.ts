/**
 * The module containing the API configuration.
 */

import { NextConfig } from "next";
import { AccessMethodList, AccessMethods, ApiKeyPermission, ApiKeyStorage, BasicApiKeyPermission } from "./api_keys";
import { NotFoundError } from "@/api/NotFoundResponse";

var apiKeys: string[] = [];
var rootKeys: string[] = [];
var accessPrivileges: Map<string, BasicApiKeyPermission> = new Map();

function parentRoute(route: string): string | undefined {
    const path = route.split("/");
    if (path.length === 1) {
        return undefined;
    } else if (path[0].length > 0) {
        // Invalid path.
        return undefined;
    } else {
        return path.slice(0, path.length - 1).join("/");
    }
}

const config: ApiKeyStorage = {
    get apiKeys() { return [...apiKeys] },
    get rootKeys() { return [...rootKeys] },
    addApiKey(apiKey: string): ApiKeyStorage {
        if (apiKeys.includes(apiKey)) {
            throw Error("Api key reserved");
        } else if (!validApiKey(apiKey)) {
            throw Error("Invalid API key");
        } else {
            apiKeys.push(apiKey);
        }
        return this;
    },

    addRootApiKey(apiKey: string): ApiKeyStorage {
        if (!apiKeys.includes(apiKey)) {
            this.addApiKey(apiKey)
            rootKeys.push(apiKey);
        } else if (rootKeys.includes(apiKey)) {
            throw Error("Key already has root access");
        } else {
            rootKeys.push(apiKey);
        }
        return this;
    },

    addAccess(apiKey: string, route: string = "/", ...methods: AccessMethods[]): ApiKeyStorage {
        if (!apiKeys.includes(apiKey)) {
            throw new NotFoundError({ message: "Api Key not found", errorCode: "404", guid: apiKey });
        }
        if (accessPrivileges.has(route)) {
            // Route found.
            accessPrivileges.get(route)?.addAccess(apiKey, ...methods);
        } else {
            // Seek parent.
            var cursor: string | undefined = parentRoute(route);
            var parent = cursor ? accessPrivileges.get(cursor) : undefined;
            while (cursor && parent === undefined) {
                cursor = parentRoute(cursor);
                parent = cursor ? accessPrivileges.get(cursor) : undefined;
            }
            accessPrivileges.set(route, BasicApiKeyPermission.from({ ALL: [], GET: [], UPDATE: [], CREATE: [], DELETE: [] }, parent));
        }
        return this;
    },

    revokeAccess(apiKey: string, route: string = "/", ...methods: AccessMethods[]): ApiKeyStorage {
        if (!apiKeys.includes(apiKey)) {
            return this;
        } else if (rootKeys.includes(apiKey)) {
            // root key access cannot be removed
            return this;
        }
        if (accessPrivileges.has(route)) {
            // Route found.
            accessPrivileges.get(route)?.removeAccess(apiKey, ...methods);
        } else {
            // Route does not have privilege. Creating new privilege with permissions revoked.
            const revoked: Iterable<[AccessMethods, string[]]> = AccessMethodList.map(
                (method) => {
                    if (methods.includes(method)) {
                        return [method, [apiKey] as string[]];
                    } else {
                        return [method, []];
                    }
                });
            // Seek parent.
            var cursor: string | undefined = parentRoute(route);
            var parent = cursor ? accessPrivileges.get(cursor) : undefined;
            while (cursor && parent === undefined) {
                cursor = parentRoute(cursor);
                parent = cursor ? accessPrivileges.get(cursor) : undefined;
            }
            accessPrivileges.set(route, new BasicApiKeyPermission([], revoked, parent));
        }
        return this;
    }
}

/**
 * Add the root api key. 
 */
if (process.env.DATA_API_KEY) {
    config.addRootApiKey(process.env.DATA_API_KEY);
}

/**
 * 
 * @param apiKey The tested API key.
 * @returns {boolean} True, if and only if the API key is a valid API key.
 */
export function validApiKey(apiKey: string): boolean {
    return config.apiKeys.includes(apiKey);
}

/**
 * Get route permissions.
 * @param route The route.
 * @returns The api key permissions for the route.
 */
function getRoutePermissions(route: string): ApiKeyPermission {

    /**
     * @todo Route specific permissions.
     */
    var permission: ApiKeyPermission | undefined = accessPrivileges.get(route);
    var cursor: string = route;
    var parent: string | undefined;
    while (permission === undefined && (parent = parentRoute(cursor))) {
        permission = accessPrivileges.get(cursor);
        cursor = parent;
    }
    if (permission) {
        return permission;
    }

    /**
     * Default route permission is all permissions to root keys, and
     * read permissions to all api keys.
     */
    return {
        get ALL() {
            return [...(config.rootKeys)]
        },
        get GET() {
            return [...(config.apiKeys)]
        },
        get DELETE() {
            return []
        },
        get CREATE() {
            return [];
        },
        get UPDATE() {
            return [];
        }
    }
}

/**
 * Test valid api read key.
 * @param apiKey The api key.
 * @param route The route.
 * @returns True, if and only if the given key has read permission for the route.
 */
export function validApiReadKey(apiKey: string, route: string = "/"): boolean {
    return validApiRouteKey(apiKey, route, "GET");
}

/**
 * Tst valid api permission.
 * @param apiKey The tested api key.
 * @param route The route.
 * @param method The method of the operation.
 * @returns True, if and only if the API key is allowed to access the route
 * with given method.
 */
export function validApiRouteKey(apiKey: string, route: string = "/", method: AccessMethods): boolean {
    return config.rootKeys.includes(apiKey) || getRoutePermissions(route).ALL.includes(apiKey) || getRoutePermissions(route)[method].includes(apiKey);
}
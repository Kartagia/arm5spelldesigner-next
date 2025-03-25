/**
 * The module containing the API configuration.
 */

import { NextConfig } from "next";

/**
 * The acces methods.
 */
export type AccessMethods = "GET"|"UPDATE"|"CREATE"|"DELETE"|"ALL";

const config: {apiKeys: string[], rootKeys: string[]} = {
    apiKeys: [],
    rootKeys: []
};

/**
 * Add the root api key. 
 */
if (process.env.DATA_API_KEY) {
    config.apiKeys.push(process.env.DATA_API_KEY);
    config.rootKeys.push(process.env.DATA_API_KEY);
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
 * The API key perssion determines permission for api keys.
 */
export interface ApiKeyPermission {
    /**
     * The API keys allowed to do all operations for the route.
     */
    ALL: string[],
    /**
     * The API keys allowed to get existing resources.
     */
    GET: string[],
    /**
     * The API keys allowed to update existing resources.
     */
    UPDATE: string[],
    /**
     * The API keys allowed to delete existing resources.
     */
    DELETE: string[],
    /**
     * The API keys allowed to create new resources.
     */
    CREATE: string[]
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

    /**
     * Defaut route permission is all permissions to root keys, and
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
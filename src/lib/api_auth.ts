
import 'server-only';
/**
 * API authentication modules.
 */

import { cookies, headers } from 'next/headers';
import { validateSession } from './session';
import pino from 'pino';
import { randomUUID, UUID } from 'crypto';
import { hashToken } from './auth';
import { apiSessionTimeout, sessionTimeout } from './dbConfig';
import { createUser, NewCredentials, NewUserInfo } from './users';
import { Client, PoolClient, ResultBuilder } from 'pg';
import { createAuthConnection, initAuthPool, NOT_CONNECTED_ERROR } from './db';
import { safeRelease } from './api_db';
import { ErrorContent } from './api_data';
import { ApiSessionInfo } from './definitions';

/**
 * The then function alterin value.
 * @param source THe source value.
 * @returns Either the result or a promise-like of result.
 */
export type ThenFunction<SOURCE, RESULT> = (source: SOURCE | Promise<SOURCE>) => RESULT | PromiseLike<RESULT>;

/**
 * The function used for chaining then allowing ignoring the previous value. 
 */
export type ThenChainFunction<SOURCE, RESULT> = (source?: SOURCE | Promise<SOURCE> | null) => RESULT | PromiseLike<RESULT>;

/**
 * The then function altering value.
 * @param source THe source value.
 * @returns Either the result or a promise-like of result.
 * @throws {ERROR} The type of the error thrown.
 */
export type TypedThenFunction<SOURCE, RESULT, ERROR = any, REJECT = ERROR> = (source: SOURCE | PromiseLike<SOURCE>) => RESULT | TypedPromise<RESULT, REJECT>;

/**
 * The chained then function function. 
 */
export type TypedThenChainFunction<SOURCE, RESULT, ERROR = any, REJECT = ERROR> = (source: SOURCE | PromiseLike<SOURCE> | null | undefined) => RESULT | PromiseLike<RESULT> | TypedPromise<RESULT, REJECT>;

/**
 * Typed executor allowing promise 
 */
export type TypedExecutor<TYPE, ERROR_TYPE = any> = (resolve: ((value: TYPE | PromiseLike<TYPE> | TypedPromise<TYPE, ERROR_TYPE>) => void),
    reject: (reason?: ERROR_TYPE) => void) => void;


/**
 * The typed promise limits error type.
 */
export interface TypedPromise<TYPE, ERROR_TYPE = any> extends PromiseLike<TYPE> {

    then<TResult1, TResult2>(thenFn?: ThenChainFunction<TYPE, TResult1>,
        catchFn?: ThenChainFunction<ERROR_TYPE, TResult2>
    ): PromiseLike<TResult1> | PromiseLike<TResult2> | PromiseLike<TResult1 | TResult2>;

    /**
     * Variant of then keeping the limited error type along. 
     * @param thenFn The typed then chain function. 
     * @param catchFn The catch function 
     */
    typedThen<RESULT, ERROR, REJECT = ERROR>(
        thenFn: TypedThenChainFunction<TYPE, RESULT, ERROR, REJECT>,
        catchFn?: TypedThenChainFunction<ERROR, RESULT, ERROR, REJECT>
    ): TypedPromise<RESULT, REJECT>;

    /**
     * 
     * @param catchFn The catch function handling errors. 
     */
    typedCatch<RESULT, ERROR, REJECT = ERROR>(
        catchFn: TypedThenChainFunction<ERROR, RESULT, ERROR, REJECT>
    ): TypedPromise<RESULT, REJECT> | TypedPromise<TYPE, ERROR_TYPE>;


    /**
     * Creates a chain of typed promises.
     * Either then function or catch function must be provided.
     * @param thenFn 
     * @param catchFn The catch function handling the 
     * @throws {SyntaxError} Both thenFn and catchFn are undefined.  
     */
    typedThen<RESULT, ERROR, REJECT = ERROR, RESULT2 = RESULT, ERROR2 = ERROR, REJECT2 = REJECT>(
        thenFn?: TypedThenChainFunction<TYPE, RESULT, ERROR, REJECT>,
        catchFn?: TypedThenChainFunction<ERROR, RESULT2, ERROR2, REJECT2>
    ): TypedPromise<RESULT, REJECT> | TypedPromise<RESULT2, REJECT2>;
}

/**
 * The authentication header name.
 */
export const authHeader = "x-openapi-token";

/**
 * The authentication cookie name.
 */
export const authCookie = "x-openapi-token";

/**
 * The API key type. 
 */
export type API_KEY = string;

/**
 * Check validity of an api key.
 * @param key The tested key.
 * @returns True, if and only if the given api key is a valid api key.
 */
export async function validApiKey(key: string | null): Promise<boolean> {
    return key != null && (key === process.env.DATA_API_KEY || await getAuthConnection().then( 
        (dbh) => {
            const result = hashToken(key).then( (token) => {
                return dbh.query("SELECT token FROM api_session WHERE NOW() < expires AND token=$1", [token]).then(
                    (result) => ( (result.rowCount ?? 0) > 0)
                )
            }).catch( error => {
                logger.error(error, "Hashing key failed.");
                return false;
            })
            safeRelease(dbh);
            return result;
        }
    ).catch(
        error => {
            logger.error(error, "Authentication service not available")
            return false;
        }
    ));
}

/**
 * The api permissions structure.
 */
export interface Permissions {
    apiKey: boolean;
    cookieKey: boolean;
}

/**
 * 
 * @returns The promise of connection to the authentication database.
 * @throws {ErrorStruct<503, "Arm5API not available at the moment">} The connection failed.
 */
export async function getAuthConnection() {
    return await createAuthConnection().catch((error) => {
        if (error === NOT_CONNECTED_ERROR) {
            logger.error(error, "Could not create auth connection. Re-initializing the pool");
            return initAuthPool(undefined).then(
                (pool) => (pool.connect()),
                (error) => {
                    logger.error(error, "Initialization of the database pool failed.")
                    throw { errorCode: 503, message: "Arm5API not available at the moment." };
                }
            )
        } else {
            // The authentication connection is not available. 
            throw { errorCode: 503, message: "Arm5API not available at the moment." };
        }
    }).catch(
        (error) => {
            logger.error(error, "Authentication database not available.");
            throw { errorCode: 503, message: "Arm5API not available at the moment." }
        })
}

/**
 * Get the cookie attribute name.
 * @param prop The property name.
 * @returns The cookie attribute name, or null, if it has none.
 */
function cookieAttrName(prop: string): string | null {
    if (prop === "maxAge") {
        return "Max-Age";
    }
    if (/^[a-z](?:[A-Z][a-z]+)*$/.test(prop)) {
        return prop.substring(0, 1).toUpperCase() + prop.substring(1);
    } else {
        return null;
    }
}

/**
 * Convert cookie structure into string for headers.
 * @param cookie The cookie.
 * @returns The strign reprsentation of the cookie. 
 */
export function cookieStructToString(cookie: Record<string, string | boolean>): string {
    const [name = undefined, value = undefined, ...attributes] = Object.getOwnPropertyNames(cookie);
    if (name) {
        return `${cookie.name}=${cookie.value ?? ""}${attributes.length > 0 ? "; " + attributes.reduce(
            (result: string[], attr: string) => {
                const key = cookieAttrName(attr);
                if (key) {
                    if (typeof cookie.attr === "boolean" && cookie.attr) {
                        // The attribute is set.
                        result.push(key)
                    } else {
                        result.push(`${key}=${encodeURIComponent(cookie[attr])}`);
                    }
                }
                return result;
            }, []
        ).join("; ") : ''}`
    } else {
        return "";
    }
}

/**
 * Create a new API session.
 * @param owner The owner of the session.
 * @returns The object containing both headerKey and the session cookie the caller may send to the client 
 * for future authentication.
 */
export async function createApiSession(owner: string, dbh?: PoolClient | Client): Promise<ApiSessionInfo> {
    const apiKey = randomUUID();
    const token = await hashToken(apiKey).catch((error) => {
        // The creation failed.
        logger.error(error, "Could not hash token into api key");
        return undefined;
    });

    // The hash-token is stored into the database, if it exists.
    if (apiKey) {
        // Get expiration time.
        const connection = dbh ?? await getAuthConnection();
        const details = await connection.query<{ key: string, expires: Date }>(
            {
                text: "INSERT INTO api_session(id, token, expires, key) VALUES ($1, $2, NOW() + make_interval(days=>$3), $4) " +
                    "ON CONFLICT ON CONSTRAINT api_session_pkey DO UPDATE SET token = EXCLUDED.token, expires = EXCLUDED.expires, key = EXCLUDED.key " +
                    "RETURNING (key, expires)",
                values: [owner, token, apiSessionTimeout, apiKey]
            }).then(
                async (result) => {
                    if (result.rowCount) {
                        // No row added.
                        return {
                            headerKey: { name: authHeader, value: apiKey }, sessionCookie: {
                                name: authCookie,
                                value: apiKey,
                                sameSite: "Strict",
                                httpOnly: "HttpOnly",
                                Path: process.env.API_ROOT ?? "/",
                                expires: result.rows[0].expires?.toUTCString()
                            }
                        };
                    } else {
                        // Row added - reaturning the new header key and session cookie. 
                        const { key, expires } = result.rows[0];
                        const answer = {
                            headerKey: { name: authHeader, value: key }, sessionCookie: {
                                name: authCookie,
                                value: "",
                                sameSite: "Strict",
                                httpOnly: "HttpOnly",
                                Path: process.env.API_ROOT ?? "/",
                                expires: result.rows[0].expires?.toUTCString()
                            }
                        };
                        return answer;
                    }
                },
                (error) => {
                    logger.error(error, "Insert or update api session for user[%s] failed.", owner)
                    safeRelease(connection);
                    throw { errorCode: 503, message: "Cuold not create api session." };
                }
            );
        if (!dbh) {
            // Releaseing the created connection.
            safeRelease(connection);
        }
        return details;
    } else {
        return { headerKey: { name: authHeader, value: "" }, sessionCookie: `${authCookie}=; Expires=${(new Date(0)).toUTCString()}; SameSite=Strict; HttpOnly; Path=${process.env.API_ROOT ?? "/"}` }
    }
}

/**
 * Get the current API session of the user.
 * @param user The user.
 * @param transaction The transaction used to perform the database operations. Defaults to a new authentication connection.
 * @returns { headerKey: { name: string, value: string}, sessionCookie?: string} The API session details. The session cookie is undefined, if
 * the session cookie does not require updating. 
 */
export async function getApiSession(user: string, transaction?: Client | PoolClient) {
    // Check if user has valid session.
    const connection = transaction ?? await getAuthConnection();

    const result = await connection.query<{ token: string, key: string, expires: Date, hasExpired: boolean, needsRefresh: boolean }>({
        text: "SELECT token, key, expires, (NOW() >= expires) AS has_expired, (NOW() + make_interval(hours=>$2*12)) >= expires as needs_refresh " +
            "FROM api_session WHERE id=$1",
        values: [user, apiSessionTimeout]
    }).then(
        (result) => {
            if (result.rowCount) {
                // There is at least one row matching (there can be only one row matching)
                return result.rows[0];
            } else {
                // There was no row available.
                return undefined;
            }
        },
        (error) => {
            logger.error(error, "Could not access the api session details.");
            throw { errorCode: 503, message: "Arm5API service not available" };
        }
    ).then(
        (detail) => {
            // Do we need to create a new session.
            if (detail && !detail.hasExpired && !detail.needsRefresh) {
                // The existing session is fine - returning the existing details.
                return { headerKey: { name: authHeader, value: detail.key } };
            } else {
                // Create new api session as the session either does not exist, or has to be updated. 
                return createApiSession(user, connection);
            }
        },
        (err: ErrorContent) => {
            throw err;
        }
    );
    // Releasing the database handle. 
    if (!transaction) {
        safeRelease(connection);
    }

    return result;

}

/**
 * Create a new user. 
 * @param user The created user information.
 * @param credentials The credentials of the user.
 * @returns Promise of response of the create user request.
 */
export async function createApiUser(user: NewUserInfo, credentials: NewCredentials): Promise<Response> {
    const response = await createUser(user, credentials).then(
        async (id) => {
            // Creating session.
            const { headerKey, sessionCookie } = await createApiSession(id);
            const headers = new Headers();
            if (sessionCookie) {
                // Adding session header. 
                headers.append("Set-Cookie", typeof sessionCookie === "string" ? sessionCookie : cookieStructToString(sessionCookie));
                return Response.json({ headerKey }, { status: 201, headers })
            } else {
                // No session header added.
                return Response.json({ headerKey }, { status: 201 });
            }
        },
        (error) => {
            // The creating of user failed.
            return Response.json(error, { status: 400 });
        }
    )

    return response;
}

/**
 * Do we have secure connection with request. 
 * @param request The request.
 * @returns True, if and only if the sconnection is HTTPS to the server. 
 */
export function secureConnection(request: Request): boolean {

    /**
     * @todo Check security of the request to be valid. 
     */
    return false;
}

/**
 * Validate an API request. 
 * @param request The request.
 * @returns The permission structure. 
 */
export async function validateApiRequest(request: Request): Promise<Permissions> {
    const result = {
        apiKey: false,
        cookieKey: false
    };

    // Test API key.
    const apiKey = request.headers.get(authHeader);
    if (await validApiKey(apiKey)) {
        result.apiKey = true;
    }

    // Test cookies. 
    const token = (await cookies()).get(authCookie)?.value;
    if (token) {
        // Has valid cookie name - validating the cookien content. 
        logger.debug("Got api session token", token);
        await getAuthConnection().then( async dbh => {
            const sought = await hashToken(token).catch( err => {
                logger.warn(err, "Validate Api Request: Could not hash the token");
                return "";
            });
            const validSession = await dbh.query("SELECT true FROM api_session WHERE token=$1 AND NOW() < expires", [sought]).then(
                result => {
                    return (result.rowCount ?? 0) > 0;
                }
            );
            safeRelease(dbh);
            if (validSession) {
                result.cookieKey = true;
            } else if (process.env.NODE_ENV === "development") {
                logger.debug("Could not find token %s for api key %s", sought, token);
            }
        }).catch(
            error => {
                logger.warn(error, "Could not access authentication database");
                return;
            }
        )
    }
    const sessionId = (await cookies()).get("auth_session")?.value;
    if (!sessionId) {
        if (token) {
            logger.info("Got app session token", token);
            const sessionInfo = await validateSession(token).catch(
                (err) => {
                    logger.error(err, "The open api session token was invalid.")
                }
            );
            if (sessionInfo && sessionInfo.userInfo) {
                // Validation was successful.
                logger.info("Valid app session for user %s", sessionInfo.userInfo.id);
                result.cookieKey = true;
            }
        } else {
            logger.info("Invalidate arm5spelldesigner session cookie for route %s", request.url);
            (await cookies()).delete("auth_session");
        }
    }
    if (sessionId && !result.cookieKey) {
        logger.info("Checking session [%s]", sessionId);
        const userInfo = await validateSession(sessionId).catch(
            (err) => {
                logger.error("Session checking failed!", err);
                return undefined;
            });
        if (userInfo) {
            result.cookieKey = true;
        }
    }

    return result;
}

/**
 * The logger used by the api.
 */
export const logger = pino();


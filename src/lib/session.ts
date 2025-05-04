import 'server-only';
/**
 * The session library.
 */

import { Lucia, TimeSpan, Cookie } from "lucia";
import { UserInfo, getUserInfo } from "./users";
import { initAuthPool } from "./db";
import { getAuthDatabaseProperties } from './dbConfig';
import { NodePostgresAdapter } from "@lucia-auth/adapter-postgresql";

const pool = await initAuthPool(undefined);
if (pool === undefined) {
    console.error("Could not initialize connectoin to the authentication database");
    throw new Error("Session database logging not available");
}
const adapter = new NodePostgresAdapter(pool, {
    /**
     * The users table name.
     */
    user: "auth_user",
    /**
     * The sessions table name.
     */
    session: "user_session"
});

/**
 * The lucian object used for session management.
 * 
 * ## Custom session attributes:
 * - apiKey of database field api_key: The API key of the session.
 */
export const lucia = new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(1, "d"),
    getSessionAttributes: (attributes) => {
        return {
            apiKey: attributes.api_key
        }
    },
    sessionCookie: {
        attributes: {
            secure: process.env.NODE_ENV === "production" && (process.env.LOCAL_PRODUCTION ?? "") !== "true"
        }
    }
});

/**
 * The dyncamid declaration of the lucia module.
 * 
 * ## Custom database session fields:
 * - api_key => varchar: The API key of the session.
 */
declare module "lucia" {
    interface Register {
        Lucia: typeof Lucia;
        DatabaseSessionAttributes: DatabaseSessionAttributes;
    }
    interface DatabaseSessionAttributes {
        api_key: string;
    }
}

/**
 * Create new session cookie.
 * @param sessionId The session identifier.
 * @returns The promise of the session cookie.
 */

export async function createSessionCookie(sessionId: string): Promise<Cookie> {
    if (sessionId) {
        return lucia.createSessionCookie(sessionId);
    } else {
        return lucia.createBlankSessionCookie();
    }
}

/**
 * Validate session.
 * @param sessionId The session identifier.
 * @returns The cookie sent to the user. The userinfo is undefined, if there is no valid session. 
 */
export async function validateSession(sessionId: string): Promise<{ userInfo: UserInfo | undefined; sessionCookie: Cookie; }> {
    try {
        const { session, user } = await lucia.validateSession(sessionId).catch( (error) => {
            console.error("Validation failed due error: %s", error);
            return { session: null, user: null };
        });
        if (session && user) {
            console.log("Session %s of user %s is kosher - getting details", session.id, user.id);
            /**
             * @todo Add creation of a new cookie, if the session is fresh - requiring refreshing.
             */
            return {
                userInfo: await getUserInfo(user.id).then((result) => {
                    console.log("Got user information");
                    return result;
                }), sessionCookie: await lucia.createSessionCookie(session.id)
            };
        } else {
            // Invalidate with blank cookien
            console.log("No valid session for session %s", sessionId);
            return { userInfo: undefined, sessionCookie: lucia.createBlankSessionCookie() };
        }
    } catch (error) {
        console.error("Session validation failed due error", error);
        return { userInfo: undefined, sessionCookie: lucia.createBlankSessionCookie() };
    }
}
/**
 * Logout session.
 * @param sessionId The session identifier.
 * @returns The blank cookie negating the login.
 */

export async function logout(sessionId: string): Promise<Cookie> {
    await lucia.invalidateSession(sessionId);
    return lucia.createBlankSessionCookie();
}
/**
 * Create a new API session.
 * @param userId The user id.
 * @param apiKey The api key token for the session.
 * @returns The promise of session.
 */
export function createSession(userId: string, apiKey: string) {
    return lucia.createSession(userId, { api_key: apiKey });
}


import 'server-only';
/**
 * The session library.
 */

import { Lucia, TimeSpan, Cookie } from "lucia";
import { UserInfo, getUserInfo } from "./users";
import { getAuthDatabaseProperties } from "./db";
import { NodePostgresAdapter } from "@lucia-auth/adapter-postgresql";
import pg from 'pg';

const pool = new pg.Pool(getAuthDatabaseProperties());
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
    return lucia.createSessionCookie(sessionId);
}

/**
 * Validate session.
 * @param sessionId The session identifier.
 * @returns The cookie sent to the user. The userinfo is undefined, if there is no valid session. 
 */
export async function validateSession(sessionId: string): Promise<{ userInfo: UserInfo | undefined; sessionCookie: Cookie; }> {
    const { session, user } = await lucia.validateSession(sessionId);
    if (session && user) {
        console.log("Session %s of user %s is kosher - getting details", session.id, user.id);
        /**
         * @todo Add creation of a new cookie, if the session is fresh - requiring refreshing.
         */
        return { userInfo: await getUserInfo(user.id).then( (result) => {
            console.log("Got user information");
            return result;
        }), sessionCookie: lucia.createSessionCookie(session.id) };
    } else {
        // Invalidate with blank cookien
        console.log("No valid session for session %s", sessionId);
        return {userInfo: undefined, sessionCookie: lucia.createBlankSessionCookie()};
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


import 'server-only';
/**
 * The session library.
 */

import { Lucia, TimeSpan, Cookie, CookieAttributes } from "lucia";
import { UserInfo, getUserInfo } from "./users";
import { getAuthDatabaseProperties } from './dbConfig';
import { NodePostgresAdapter } from "@lucia-auth/adapter-postgresql";
import { Client, Pool } from 'pg';
import { randomUUID, UUID } from 'crypto';
import { hashToken } from './auth';
import { sessionTimeout } from './dbConfig';

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


const pool = new Pool(getAuthDatabaseProperties());

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
const lucia: Lucia = new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(sessionTimeout, "d"),
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

async function createBlankCookie(cookieName: string = "session", options: CookieAttributes={}) {

    return new Cookie(cookieName, "", options);
}


async function nonLuciaCreateSessioCookie(sessionToken: string, cookieName: string = "session", options: CookieAttributes={}) {
    return new Cookie(cookieName, sessionToken, options);
}

/**
 * Create new session cookie.
 * @param sessionId The session identifier.
 * @returns The promise of the session cookie.
 */

export async function createSessionCookie(sessionId: string, cookieName: string = "session", options: CookieAttributes = {}): Promise<Cookie> {
    if (sessionId) {
        return lucia?.createSessionCookie(sessionId) ?? await nonLuciaCreateSessioCookie(sessionId, cookieName, options);
    } else {
        return lucia?.createBlankSessionCookie() ?? await createBlankCookie();
    }
}

interface Session {
    id: string,
    userId: string;
    apiKey: UUID;
    expireAt: Date;
}

interface User {
    id: string;
    email: string;
    displayname: string;
    verified?: boolean;
    expires: Date;
}

async function validateSessionImpl(sessionToken: string) {
    const sessionId = await hashToken(sessionToken);
    const result = await pool.query<Session & {refreshen: boolean} & Omit<User, "id">>("SELECT user_session.id, user_id, api_key, expires_at, "+
        ", NOW() + make_interval( hours => $2*12) >= expires_at as refreshen " +
        ", email, displayname, verified, expires " +
        "FROM user_session JOIN auth_user ON user_session.user_id = auth_user.id WHERE id = $1 AND expire_at > NOW()", [sessionId, sessionTimeout]);
    if (result.rowCount ?? 0) {
        // We got a session.
        if (result.rows[0].refreshen) {
            // Update the cookie. 
            await pool.query("DELETE FROM user_session WHERE id=$1", [sessionId]);
            const newToken = randomUUID();
            const newSessionId = await hashToken(newToken);
            const newSession = await pool.query("INSERT INTO user_session(id, user_id, expire_at, api_key) VALUES ($1, $2, NOW()+ make_interval(days=>$3), $4) " + 
                "RETURNING (id, user_id, expire_at, api_key)", 
                [newSessionId, result.rows[0].userId, sessionTimeout, randomUUID()]
            )
        }
        return {session: result.rows[0], sessionCookien: nonLuciaCreateSessioCookie(sessionToken) };
    } else {
        return {session: null, sessionCookie: nonLuciaCreateSessioCookie("") };
    }
}

/**
 * Validate session.
 * @param sessionId The session identifier.
 * @returns The cookie sent to the user. The userinfo is undefined, if there is no valid session. 
 */
export async function validateSession(sessionId: string): Promise<{ userInfo: UserInfo | undefined; sessionCookie: Cookie; }> {
    try {
        const { session, user } = await (lucia?.validateSession(sessionId) || validateSessionImpl(sessionId)).catch((error) => {
            console.error("Validation failed due error: %s", error);
            return { session: null, user: null };
        });
        if (session && user) {
            /**
             * @todo Add creation of a new cookie, if the session is fresh - requiring refreshing.
             */
            return {
                userInfo: await getUserInfo(user.id).then((result) => {
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


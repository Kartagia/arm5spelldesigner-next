
import { NodePostgresAdapter } from "@lucia-auth/adapter-postgresql";
import { Lucia, TimeSpan } from "lucia";
import pg from 'pg';
const pool = new pg.Pool();
const adapter = new NodePostgresAdapter(pool, {
    user: "auth_user",
    session: "user_session"
});

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
 * The authentication module.
 */

export const EmailField = "email";

export const PasswordField = "password";


/**
 * Validate an email address.
 * @param value The tested value.
 * @returns True, if and only if the email is a valid email address.
 */
export function validEmail(value: string): boolean {

    return /^(?:[\w-]+\.)*(?:[\w-]+)@(?:\w+\.)*(?:\.\w{2,})$/.test(value);
}

/**
 * Test validity of a password.
 * @param value The tested value.
 * @returns True, if and only if the email is a valid password.
 */
export function validPassword(value: string): boolean {
    return value.trim().length >= 14;
}
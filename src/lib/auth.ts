
import { NodePostgresAdapter } from "@lucia-auth/adapter-postgresql";
import { Lucia, TimeSpan } from "lucia";
import pg, { Connection, PoolClient } from 'pg';
import { createApiConnection, getAuthDabaseProperties } from "./db";
import { randomBytes, pbkdf2, generateKey } from 'node:crypto';
import { UserInfo } from "./users";
const pool = new pg.Pool(getAuthDabaseProperties());
const adapter = new NodePostgresAdapter(pool, {
    user: "auth_user",
    session: "user_session"
});

/**
 * The authentication related configuration.
 */
export interface AuthConfig {


    /**
     * The hashing algorithm iteration count.
     */
    iterations: number; 

    /**
     * The hash key lenght in bytes.
     */
    keyLen: number;

    /**
     * The salt length in bytes.
     */
    saltLen: number;

    /**
     * The hashing digest usest. 
     */
    digest: string;

    /**
     * The length of the API key in bytes.
     */
    apiKeyLen: number;
}

const config : AuthConfig = {
    iterations: 100000,
    keyLen: 64,
    saltLen: 20,
    digest: 'sha512',
    apiKeyLen: 32
}

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
 * The authentication module form field name for email.
 */
export const EmailField = "email";

/**
 * The authetnicaiton module form field name for password.
 */
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
 * An error indicating that the password has been compromised into the dark web.
 */
export class PasswordCompromisedError extends Error {

    /**
     * Create a new password comprimsied error.
     * @param message Optional message of the error.
     * @param hash The optional ivnalid hash. 
     */
    constructor(message: string = "Password hash found in the compromised hashes", 
        hash: string | undefined = undefined
    ) {
        super(message, {cause: hash});
        this.name = this.constructor.name;
    }
}

/**
 * Test hasshed password validity.
 * @param hashed The tested hashed password.
 * @returns Promise of boolean indicating whether the hashed password 
 * is a valid password.
 * @throws {PasswordCompromisedError} The password hash has been compromised.
 */
export function validHashedPassword(hashed: string): Promise<boolean> {

    /**
     * @todo Add Copenhagen protocol tests for the hashed password. 
     */

    // The default test ensures the hashed password is long enough.
    return Promise.resolve(hashed.length > (128 / 16));
}

/**
 * Generate a new salt.
 * @returns The promise of the generated salt.
 */
export function generateSalt(): Promise<string> {
    var salt: Int8Array = new Int8Array(config.saltLen);
    return Promise.resolve(randomBytes(config.saltLen).toString('hex'));
}

/**
 * Hash a password.
 * @param password The hashed password.
 * @param salt The salt.
 * @returns The hashed passwrod.
 */
export function hashPassword(password: string, salt: string): Promise<string> {

    return new Promise(async (resolve, reject) => {
        pbkdf2(password, salt, config.iterations, config.keyLen, config.digest, (
            err, derivedKey
        ) => {
            if (err) {
                reject(err);
            } else {
                resolve(derivedKey.toString('hex'));
            }
        })
    });
}

/**
 * Test validity of a password.
 * @param value The tested value.
 * @returns True, if and only if the email is a valid password.
 */
export function validPassword(value: string): boolean {
    return value.trim().length > 14;
}

/**
 * Changes the password of the user and update credentials.
 * @param userId The user identifier.
 * @param password The password. 
 * @param transaction The database transaction into which the operation belongs.
 * Defaults to a new autocommited transaction.
 * @returns The promise of completion.
 */
export async function setPassword(userId: string, password: string,
    transaction: PoolClient | undefined = undefined): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const dbh = transaction ?? (await createApiConnection().then(
            async conn => {await conn.connect(); return conn},
            error => { throw error }));
        try {
            if (!transaction) {
                await dbh.query("start transaction");
            }
            const salt = await generateSalt();
            await dbh.query(
                "insert into user_credentials (id, password, salt) "+
                "VALUES ($1, $2, $3)", 
                [userId, await hashPassword(password, salt), salt]
            );
            if (!transaction) {
                await dbh.query("commit");
            }
        } catch (error) {
            // Error handling.
            console.error("setPassword: Could not update user credentials", error);
            throw error;
        } finally {
            if (!transaction) {
                dbh.release();
            }
        }
    });
}


/**
 * Create a new API session.
 * @param userId The user id.
 * @param apiKey The api key. Defaults to a new generated API key.
 * @returns The promise of session.
 */
export function createSession(userId: string, apiKey: string|undefined = undefined) {
    if (apiKey) {
        return lucia.createSession(userId, { api_key: apiKey });
    } else {
        return lucia.createSession(userId, { api_key: randomBytes(config.apiKeyLen).toString('base64') });
    }
}
/**
 * The credentials of the user.
 */

export interface Credentials {
    /**
     * The user id.
     */
    id: string;

    /**
     * The salt of the usr password.
     */
    salt: string;

    /**
     * The hashed salted password.
     */
    password: string;
}

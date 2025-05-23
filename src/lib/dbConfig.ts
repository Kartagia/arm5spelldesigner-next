import 'server-only';
import { PoolOptions } from 'pg';

/**
 * The database configuration library.
 * @module config/db
 */

export const sessionTimeout = 1;
export const apiSessionTimeout = 30;
export const auth_database = "user_credentials";
export const sessionDatabase = "user_session";
export const userDatabase = "auth_user";

/**
 * Get the pool options for the authentication database.
 * @returns The pool options for authentication database.
 */

export function getAuthDatabaseProperties(): Partial<PoolOptions> {
    if (process.env.AUTH_CONNECT ?? process.env.DATABASE_URL) {
        const url = process.env.AUTH_CONNECT ?? process.env.DATABASE_URL;
        if (url && /^socket:|^\//.test(url)) {
            return {
                connectionString: url
            }
        } else {
            return {
                connectionString: process.env.AUTH_CONNECT ?? process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false
                }
            };
        }
    } else {
        return {
            database: process.env.AUTH_DATABASE,
            user: process.env.AUTH_USER,
            host: process.env.AUTH_HOST,
            port: Number(process.env.AUTH_PORT ?? "5432"),
            password: process.env.AUTH_PASSWORD,
            idleTimeoutMillis: 100,
            connectionTimeoutMillis: 500
        };
    }
}/**
 * Get the pool options for the authentication database.
 * @returns The pool options for authentication database.
 */

export function getTestAuthDatabaseProperties(): Partial<PoolOptions> {
    if (process.env.VITE_AUTH_CONNECT) {
        return {
            connectionString: process.env.VITE_AUTH_CONNECT
        };
    } else {

        return {
            database: process.env.VITE_AUTH_DATABASE,
            user: process.env.VITE_AUTH_USER,
            host: process.env.VITE_AUTH_HOST,
            port: Number(process.env.VITE_AUTH_PORT ?? "5432"),
            password: process.env.VITE_AUTH_PASSWORD,
            connectionTimeoutMillis: 1000
        };
    }
}
/**
 * Get the pool options for the api database.
 * @returns The pool options for api database.
 */

export function getApiDatabaseProperties(): Partial<PoolOptions> {
    if (process.env.DATA_CONNECT ?? process.env.DATABASE_URL) {
        const url = process.env.DATA_CONNECT ?? process.env.DATABASE_URL;
        if (url && /^socket:|^\//.test(url)) {
            return {
                connectionString: url
            }
        } else {
            return {
                connectionString: process.env.DATA_CONNECT ?? process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false
                }
            };
        }
    } else {
        return {
            database: process.env.DATA_DATABASE,
            user: process.env.DATA_USER,
            host: process.env.DATA_HOST,
            port: Number(process.env.DATA_PORT ?? "5432"),
            password: process.env.DATA_PASSWORD,
        };
    }
}



import 'server-only';
/**
 * API authentication modules.
 */

import { cookies } from 'next/headers';
import { validateSession } from './session';
import pino from 'pino';
import { redirect } from 'next/dist/server/api-utils';
import { NextRequest, NextResponse } from 'next/server';
import { NextURL } from 'next/dist/server/web/next-url';
import { userInfo } from 'os';

/**
 * Check validity of an api key.
 * @param key The tested key.
 * @returns True, if and only if the given api key is a valid api key.
 */
export function validApiKey(key: string | null): boolean {
    return key != null && key === process.env.DATA_API_KEY;
}

/**
 * The api permissions structure.
 */
export interface Permissions {
    apiKey: boolean;
    cookieKey: boolean;
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
    const apiKey = request.headers.get("x-openapi-token");
    if (validApiKey(apiKey)) {
        result.apiKey = true;
        logger.info("Checking API key: [SUCCESS]");
    } else {
        logger.info("Checking API key: [FAILED]");
    }

    // Test cookies. 
    const sessionId = (await cookies()).get("auth_session")?.value;
    if (!sessionId) {
        const token = (await cookies()).get("x-openapi-token")?.value;
        if (token) {
            logger.info("Got x-session-token [%s]", token);
            const sessionInfo = await validateSession(token).catch(
                (err) => {
                    logger.error(err, "The open api session token was invalid.")
                }
            );
            if (sessionInfo && sessionInfo.userInfo) {
                // Validation was successful.
                logger.info("Valid API session for user %s", sessionInfo.userInfo.id);
                result.cookieKey = true;
            }
        } else {
            logger.info("Invalidate session cookie for route %s", request.url);
            (await cookies()).delete("x-session-token");
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
            logger.info("Checking session key: [SUCCEEDED]");
        } else {
            logger.info("Checking session key: [FAILED]");
        }
    }

    return result;
}

/**
 * The logger used by the api.
 */
export const logger = pino();


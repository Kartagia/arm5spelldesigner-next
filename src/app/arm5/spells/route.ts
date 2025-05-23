

/**
 * Route for storing spells. 
 * 
 * @module api/spells
 */

import { createApiConnection, initApiPool } from "@/lib/db";
import { SpellModel, validRDT } from '@/lib/spells';
import { checkUUID, validUUID } from '@/lib/modifiers';
import { randomUUID, UUID } from 'crypto';
import { logger, validateApiRequest } from '@/lib/api_auth';
import { safeRelease } from "@/lib/api_db";
import { ErrorReply } from "@/lib/api_data";

export const revalidate = 0;


/**
 * Get all spells. 
 * @param request The API request.
 * @returns The reply to the request. 
 */
export async function GET(request: Request) {
    const privileges = await validateApiRequest(request);
    if (privileges.apiKey || privileges.cookieKey) {
        // Authentication passed. 
        logger.debug("User authenticated. Loading data...");
        return createApiConnection().catch(
            async (error) => {
                if (error === "Not initialized" || error.message === "Not initialized") {
                    // The server api pool is not yet initialized.
                    const pool = await initApiPool();
                    return pool.connect();
                }
                throw error;
            }
        ).then(async dbh => {
            logger.debug("Connection established");
            const result =  await dbh.query<{guid: UUID, value: SpellModel}>("SELECT guid, value FROM api_spells").then(
                (result) => {
                    logger.info("Responding with %d spells", result.rowCount);
                    return Response.json(result.rows.map((spell) => {
                        try {
                            const {guid, value} = spell;
                            return [checkUUID(guid), value];
                        } catch (error) {
                            if (Array.isArray(spell)) {
                                logger.error(error, "Error in parsing spell value [%s, %s]", spell?.[0], spell?.[1]);
                            } else {
                                logger.error(error, "Error in parsing spell value %s", spell);
                            }
                        }
                    }));
                },
                (error) => {
                    // The error.
                    logger.error("Fetching all spells failed %s", error);
                    return ErrorReply(503, "Spells API not available at the moemnt");
                }

            ).finally(() => {
                safeRelease(dbh);
                logger.debug("Database released");
            });
            return result;
        });
    } else {
        return Response.json({ message: "Authentication required", code: 401 }, { status: 401 });
    }
}

/**
 * Get invalid properites of the received spell json.
 * @param value Teh received valeu.
 * @returns The array of invalid properties. 
 */
function getInvalidSpellProperties(value: any): { propertyName: string, message?: string, error?: { message?: string, errorCode?: number } }[] {
    if (value == null || typeof value !== "object") {
        return [ {propertyName: "*", message: "Invalid content" } ]
    }

    /**
     * The ivalid properties structure.
     */
    const invalidProperties: { propertyName: string, message?: string, error?: { message?: string, errorCode?: number } }[] = [];
    ([ 
        ...["name"].map( (prop) => ([prop, (
            (value: any) => (typeof value === "string" && /^(?:\p{Lu}|\p{Lt})\p{Ll}+(?:(?:, |[ -])[\p{L}\p{N}]+)*$/u.test(value.normalize())))])), 
        ...["level"].map( (prop) => 
            ([prop, ((value: any) => (
                (typeof value === "string" && value === "Generic") || 
                Number.isSafeInteger(value))) ])), 
    ...["range", "duration", "target"].map(
        (prop) => {
            return [prop, (value: any) => (value === undefined || 
                (Array.isArray(value) && value.length > 0 && value.every(validUUID)))]
        }
    )]  as [string, Function][]).forEach( ([prop, validator]:[string, Function]) => {
        try {
            if (!validator(value[prop])) {
                console.debug(`Invalid ${prop}: ${value[prop]}`);
                throw Error("Property name failed validation");
            }
        } catch (error) {
            invalidProperties.push({
                propertyName: prop,
                error: (typeof error === "object" && error != null && "message" in error ? {
                    message: error.message?.toString(),
                    errorCode: "errorCode" in error && error.errorCode ? Number(error.errorCode) : undefined
                } : undefined
            )});
        }
    })
    return invalidProperties;
}

/**
 * Add a new spell to the spells.
 * @param request Teh request.
 */
export async function POST(request: Request) {
    const privileges = await validateApiRequest(request);
    if (privileges.cookieKey) {
        // Authentication passed. 
        logger.debug("User authenticated. Checking content...");

        // Testing payload.
        if (!request.headers.get("Content-Type")?.match(/^(?:[\w-]+)\/json(?:;|\s*$)/)) {
            // Invalid content type.
            return Response.json({ message: "Invalid content type", code: 422 }, { status: 400 })
        }
        const newSpell = await request.json();
        const invalidProperties = getInvalidSpellProperties(newSpell);
        if (invalidProperties.length > 0) {
            return Response.json({
                message: "Invalid new spell",
                invalidProperties, code: 400
            }, { status: 400 });
        }


        // Performing the update. 
        logger.debug("Updating spells...");
        return createApiConnection().catch(
            async (error) => {
                if (error === "Not initialized" || error.message === "Not initialized") {
                    // The server api pool is not yet initialized.
                    logger.info("Initializing api connection pool");
                    const pool = await initApiPool(undefined);
                    return pool.connect();
                }
                throw error;
            }
        ).then(async dbh => {
            logger.debug("Connection established");
            return await dbh.query("INSERT INTO api_spells(guid, value) "+
                "VALUES ($1, $2) RETURNING (guid)", [
                randomUUID(), newSpell
            ]).then(
                (result) => {
                    const id = result.rows[0].guid;
                    logger.info("Adding new spell with UUID %s", id);
                    return Response.json(id);
                },
                (error) => {
                    // The error.
                    logger.error("Adding new spell failed %s", error);
                    return Response.json({ message: "Something went wrong when adding spell", errorCode: 500 }, { status: 500 });
                }

            ).finally(() => {
                dbh.release();
                logger.debug("Database released");
            });
        });
    } else {
        return Response.json({ message: "Authentication required", code: 401 }, { status: 401 });
    }

}
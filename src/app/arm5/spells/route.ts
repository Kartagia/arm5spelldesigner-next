

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

export const revalidate = 0;



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
            return await dbh.query<[UUID, SpellModel]>("SELECT guid, value FROM api_spells").then(
                (result) => {
                    logger.info("Responding with %d spells", result.rowCount);
                    return Response.json(result.rows.map((spell) => {
                        try {
                            const [guid, value] = spell;
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
        ...["name"].map( (prop) => ([prop, ((value: any) => (prop in value && typeof value[prop] === "string" && value[prop]))])), 
        ...["level"].map( (prop) => ([prop, ((value: any) => (prop in value && value[prop] === "Generic" || Number.isSafeInteger(Number(value[prop])))) ])), 
    ...["range", "duration", "target"].map(
        (prop) => {
            return [prop, (value: any) => (value instanceof Object && (!(prop in value) || (validUUID(value[prop]) || validRDT(value[prop]))))]
        }
    )]  as [string, Function][]).forEach( ([prop, validator]:[string, Function]) => {
        try {

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
        const newSpell = request.json();
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
                    const pool = await initApiPool();
                    return pool.connect();
                }
                throw error;
            }
        ).then(async dbh => {
            logger.debug("Connection established");
            return await dbh.query("INSERT INTO api_spells(id, value) VALUES ($1, $2) RETURNING (id)", [
                randomUUID(), newSpell
            ]).then(
                (result) => {
                    const id = result.rows[0].id;
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
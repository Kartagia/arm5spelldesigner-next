

/**
 * Arts api route. 
 */

import { logger, validateApiRequest, createApiSession } from "@/lib/api_auth";
import { ApiArt, ErrorReply, JournalId, UnauthorizedReply } from "@/lib/api_data";
import { safeRelease } from "@/lib/api_db";
import { createApiConnection, initApiPool } from "@/lib/db";
import { NextRequest } from "next/server";
import { Logger } from "pino";

/**
 * Get all arts. 
 * @param request The request to get all arts.
 * @returns If the user has permissions to read arts, returns the array of guid-art-pairs of the api.
 * - If user does not have permission, either unauthorized or forbidden response is returend depending
 * whether the user is not autenticated (unauthorised), or have no rigth toaccess (frobidden).
 */
export async function GET(request: NextRequest) {

    const permissions = await validateApiRequest(request);
    if (permissions.apiKey || permissions.cookieKey) {
        console.log("Permission granted");
        try {
            const result = await createApiConnection().catch( (err) => {
                if (err === "Not initialized" || "message" in err &&  err.message === "Not initialized" ) {
                    return initApiPool().then( (pool) => (pool.connect()));
                } else {
                    throw err;
                }
            }).then(
                (dbh) => {
                    // Database connection available.
                    console.log("Connection established");
                    return dbh.query<ApiArt & JournalId<"art.form" | "art.technique">>("SELECT * FROM api_arts").then(
                        async (result) => {
                            console.log("");
                            const rows = await result.rows.map(entry => [entry.guid, entry as ApiArt]);
                            safeRelease(dbh);
                            return Response.json(rows);
                        },
                        (error) => {
                            // Trying without view. 
                            return dbh.query<ApiArt & JournalId<"art.form" | "art.technique">>("SELECT name, artview.type, style, guid, rdt_type, starttime as start_time " +
                                "FROM (" +
                                "select *, 'Form' as type, 'art.form' as rdt_type from arts join forms as A on arts.id = A.art_id JOIN magicstyles ON style_id = magicstyles.id " +
                                "UNION " +
                                "select *, 'Technique' as type, 'art.technique' as rdt_type from arts join techniques as A on arts.id = A.art_id JOIN magicstyles ON style_id = magicstyles.id" +
                                ") as artsview JOIN guis ON art_id = guids.id AND rdt_type = guids.type"
                            ).then(
                                (result) => {
                                    safeRelease(dbh);
                                    return Response.json(result.rows.map(row => ([row.guid, { type: row.type, name: row.name, style: row.style }])));
                                },
                                (error) => {
                                    logger.error(error, "Fetching rows failed");
                                    safeRelease(dbh);
                                    return ErrorReply(500, "Database access error");
                                }
                            )
                        }
                    )
                },
                (error) => {
                    logger.error(error, "Connection refused");
                    return ErrorReply(503, "Service is not available");
                }
            );
            // Release dbh.
            return result;
        } catch (error) {
            logger.error(error, "Fetching data failed");
            return ErrorReply(500, "Something went wrong.");
        }
    } else {
        logger.error("Unauthorized access");
        return UnauthorizedReply();
    }
}
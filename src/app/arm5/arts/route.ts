

/**
 * Arts api route. 
 */

import { logger, validateApiRequest } from "@/lib/api_auth";
import { createApiConnection } from "@/lib/db";
import { getApiDatabaseProperties } from "@/lib/dbConfig";
import { UUID } from "crypto";
import { NextRequest } from "next/server";
import { Client, Pool } from "pg";
import { Logger } from "pino";
import { permission } from "process";
import { resourceLimits } from "worker_threads";

/**
 * Create GUID reply
 * @param guid
 * @returns 
 */
function CreateGuidReply(guid: UUID) {
    return Response.json(guid);
}

/**
 * Resource content. 
 */
interface ResourceContent<TYPE> {
    guid: UUID;
    value: TYPE;
}

interface GuidContent {
    guid: UUID;

}

/**
 * Error content.
 */
interface ErrorContent {
    /**
     * The message of the error.
     */
    message?: string;

    /**
     * The error code. 
     */
    errorCode?: number;
}

interface InvalidResourceContent extends ErrorContent {
    invalidProrties: { propertyName: string, message?: string }[]
}

function InvalidResourceReply(invalidProperties: Record<string, string | string[]>, guid?: UUID) {

    return
}

function ErrorReply(errorCode: number = 400, message?: string) {
    if (errorCode < 400) {
        throw new SyntaxError("The result is not an error");
    }
    return Response.json({ message, errorCode }, { status: errorCode });
}

function NotFoundReply(guid?: UUID, refType?: string, message: string = "Not found!") {

    return Response.json({ guid, refType, message, errorCode: 404 }, { status: 404 })
}

function UnauthorizedReply(message?: string, errorCode: 401 | 403 = 401) {
    return Response.json({ message: "Access denied. Please login to acquire credentials.", errorCode });
}

interface RefType<TYPE extends string> {
    guid: UUID,
    refType: string,
    startTime: string
}

interface ApiArt {
    guid?: UUID,
    type: "Form" | "Technique",
    abbrev: string,
    name: string,
    style: string
}


/**
 * Get all arts. 
 * @param request 
 * @returns 
 */
export async function GET(request: NextRequest) {

    const permissions = await validateApiRequest(request);
    if (permissions.apiKey || permissions.cookieKey) {
        console.log("Permission granted");
        const result = await createApiConnection().then(
            (dbh) => {
                // Database connection available.
                console.log("Connection established");
                dbh.query<ApiArt & RefType<"art.form">>("SELECT * FROM api_art_view").then(
                    async (result) => {
                        console.log("");
                        const rows = await result.rows.map(entry => [entry.guid, entry as ApiArt]);
                        dbh.release();
                        return Response.json(rows);
                    },
                    (error) => {
                        // Trying without view. 
                        return dbh.query("SELECT name, artview.type, style, guid, rdt_type, starttime as start_time " + 
                            "FROM (" + 
                            "select *, 'Form' as type, 'art.form' as rdt_type from arts join forms as A on arts.id = A.art_id JOIN magicstyles ON style_id = magicstyles.id " +
                            "UNION " +
                            "select *, 'Technique' as type, 'art.technique' as rdt_type from arts join techniques as A on arts.id = A.art_id JOIN magicstyles ON style_id = magicstyles.id" +
                            ") as artsview JOIN guis ON art_id = guids.id AND rdt_type = guids.type"
                        ).then( 
                            (result) => {
                                return Response.json(result.rows.map( row => ([row.guid, {type: row.type, name: row.name, style: row.style}])));
                            },
                            (error) => {
                                logger.error(error, "Fetching rows failed");
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
    } else {
        logger.error("Unauthorized access");
        return UnauthorizedReply();
    }
}
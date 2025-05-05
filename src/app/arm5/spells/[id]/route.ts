import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, logger } from '@/lib/api_auth';
import { validUUID } from "@/lib/modifiers";
import { createApiConnection, initApiPool } from "@/lib/db";


/**
 * Get single spell. 
 * @param request The request for API.
 * @param params The route parameters. 
 * @returns The response ot the API request. 
 */
export async function GET( request: NextRequest, { params } : {params: Promise<{ id: string }>} ) {

    const permissions = await validateApiRequest(request);
    
    if (permissions.apiKey || permissions.cookieKey) {
        const { id } = await params;
        if (validUUID(id)) {

            // Getting the spell.
            await initApiPool().then( () => {
                return createApiConnection()
            }).then(
                async dbh => {
                    return dbh.query(
                        "SELECT value FROM api_spells WHERE id=$1", [id]
                    ).then(
                        (result) => {
                            // Create resulting API connection from result.
                            if (result.rowCount ?? 0 > 0) {
                                return NextResponse.json(result.rows[0]);
                            } else {
                                return NextResponse.json({ guid: id }, {status: 404});
                            }
                        }
                    ).finally(
                        () => {
                            dbh.release();
                        }
                    )
                }
            )
        } else {
            return NextResponse.json({guid: id}, {status: 404})
        }
    } else {
        return NextResponse.json({message: "Login required", errorCode: 401}, {status: 401});
    }
}
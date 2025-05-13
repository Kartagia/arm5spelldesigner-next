import { getAllRDTs } from "@/data/rdts";
import { createUUID } from "@/lib/modifiers";


/**
 * Get all RDTs. 
 * @param request The request.  
 * @returns The array of all RDTS. 
 */
export async function GET(request: Request) {
    try {
        return Response.json((await getAllRDTs()).map( (rdt, index) => ([rdt.guid ?? createUUID(index+1), rdt])), {status: 200});
    } catch(error) {
        return Response.json({message: "Could not generate UUID", errorCode: 500}, {status: 500});
    }
}
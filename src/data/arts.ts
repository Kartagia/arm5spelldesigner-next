"use server"
import { createApiConnection, initApiPool } from "@/lib/db";
import { ArtModel } from "@/lib/spells";
import { PoolClient } from "pg";

export async function getAllArts(): Promise<ArtModel[]> {

    const pool = await initApiPool();
    let dbh: PoolClient|undefined = undefined;
    try {
        dbh = await pool.connect();
        console.log("Connection established");
        const result = await dbh.query<ArtModel>(
            "select guid, abbrev, art, artsview.type as type from (select * from ref_info as guids where type like 'art.%') as guid join artsview on id = art_id;"
            );
        console.log("Loaded %d arts", result.rowCount);
        return result.rows;
    } finally {
        () => {
            dbh?.release();
            console.log("Connection released");
        }
    }
}

export async function getAllForms(): Promise<ArtModel[]> {
    return await getAllArts().then( (results) => (results.filter( art => (art.type === "Form")))).then(
        (result) => {
            console.debug("Loaded %d forms", result.length);
            return result;
        }, 
        (error) => {
            console.debug("Loaded %d forms", 0);
            throw error;
        }
    )
}

export async function getAllTechniques(): Promise<ArtModel[]> {
    return await getAllArts().then( (results) => (results.filter( art => (art.type === "Technique")))).then(
        (result) => {
            console.debug("Loaded %d techniques", result.length);
            return result;
        }, 
        (error) => {
            console.debug("Loaded %d techniques", 0);
            throw error;
        }
    )
}
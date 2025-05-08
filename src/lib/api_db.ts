import 'server-only';
import { Client, ClientConfig, Pool, PoolClient, PoolConfig, Query, QueryResult, QueryResultRow, ResultBuilder } from 'pg';
import { getApiDatabaseProperties } from './dbConfig';
import { logger } from './logger';

/**
 * The database library for the API database access.
 */

/**
 * The database pool. 
 * - An undefined pool indicates no further pool initialization is allowed. 
 */
var pool: Pool|undefined|null;

/**
 * The placeholder for future error of unsupported. 
 */
export const UnsupportedError = Error;

/**
 * Shutdown the API pool. 
 */
export async function shutdownApiPool(): Promise<void> {
    const target = pool;
    pool = null;
    await target?.end();
}

/**
 * Initialize the api pool, if needed.
 * @param config The configuration used instead of default configuration.
 * @return The promise of the current connection pool. 
 */
async function initApiPool(config?: PoolConfig|undefined): Promise<Pool> {
    if (pool === null) {
        throw new UnsupportedError("API Pool shutdown");
    } else if (config !== undefined|| pool === undefined) {
        return new Promise( async (resolve, reject) => {
            const newPool = new Pool(config ?? getApiDatabaseProperties())
            try {
                // Create a test connection released immediately.
                await newPool.connect().then( (dbh) => (dbh.release()));
                pool = newPool;
                return pool;
            } catch(error) {
                logger.error("API Database connection failed: %s", error);
                reject(new UnsupportedError("API pool not available at the moment"));
            }
        })
    } else {
        try {
            await pool.connect().then( (dbh) => (dbh.release()));
            return pool;
        } catch(error) {
            logger.error("API Database connection pool no longer functions: %s", error);
            throw new UnsupportedError("API Pool not available");
        }

    }
}

/**
 * The interface of the function given to the connection paramters.
 * @param dbh The database client performing the operation.
 * @param transaction Is the client within transaction. @default false  
 */
export type SqlQuery<TYPE extends QueryResultRow = any> = (
    /**
     * The database client performing the query.
     */
    dbh: Client | PoolClient, 
    /**
     * Is the client in transaction. 
     */
    transaction?: boolean) => (QueryResult<TYPE> | Promise<QueryResult<TYPE>>);

/**
 * 
 * @param pooled Is the acquried connection pooled. 
 * @returns The promise of a connection to the databse. 
 */
export async function getAPIConnection(pooled: boolean = true, config?: PoolConfig|ClientConfig): Promise<Client|PoolClient> {
    if (pooled)  {
        return initApiPool(config).then( pool => (pool.connect()));
    } else {
        // Creating single case connection. 
        const client = new Client(config ?? getApiDatabaseProperties());
        try {
            client.connect();
            return client;
        } catch(error) {
            throw new UnsupportedError("API connection not available.");
        }
    }
}

/**
 * Perform safe release on the database client.
 * @param dbh The database client.
 */
export async function safeRelease(dbh: Client|PoolClient): Promise<void> {
    try {
        if ("release" in dbh) {
            dbh.release();
        } else {
            dbh.end();
        }
    } catch(error) {
        logger.error("(Ignore) Closing connection failed: %s", error);
    }
}

/**
 * Execute API query with either new client from the pool or unpooled client.
 * @param query The SQL query.
 * @returns The promise of the query result. 
 */
export async function executeQuery<TYPE extends QueryResultRow = any>(query: SqlQuery<TYPE>): Promise<QueryResult<TYPE>> {
    return getAPIConnection(true).then( 
        dbh => ({dbh, finishHim: false}),
        async error => {
        logger.log("Trying unpooled access");
        return { dbh: await getAPIConnection(false), finishHim: true };
    }).then( async ({dbh, finishHim}) => {
        const connId = createConnectionId();
        logger.debug("Connection[%s] created", connId);
        try {
            const result = await query(dbh);
            if (finishHim) {
                await safeRelease(dbh);
                logger.debug("Connection[%s] released", connId);
            }
            return result;
        } catch( error ) {
            logger.error("Query failed: %s", error);
            if (finishHim) {
                await safeRelease(dbh);
                logger.debug("Connection[%s] released", connId);
            }
            throw error;
        }
    })
}

/**
 * Execute API query within a transcation automatically committed. 
 * A new pool client or an unpooled client is created for the transaction.
 * @param query The SQL query.
 * @returns The promise of the query result. 
 */
export async function executeTransaction<TYPE extends QueryResultRow = any>(query: SqlQuery<TYPE>): Promise<QueryResult<TYPE>> {
    return getAPIConnection(true).catch( error => {
        return getAPIConnection(false);
    }).then( dbh => {
        const connId = createConnectionId();
        return dbh.query("BEGIN").then( 
            async () => {
                logger.debug("Transaction[%s] created", connId);
                try {
                    const result = await query(dbh, true);
                    // Releasing the handle. 
                    dbh.query("COMMIT").catch( error => {
                        logger.warn("(Ignored)The committing of the transaction failed: %s", error);
                    });
                    try {
                        await safeRelease(dbh);
                        logger.debug("Transaction[%s] released", connId);
                    } catch(error) {
                        logger.error("(Ignored)Could not release the transaction client: %s", error);
                    }
                    return result;
                } catch(error) {
                    await dbh.query("ROLLBACK").then( (error) => {
                        console.error("(Ignored)Rollback failed: %s", error);
                    });
                    await safeRelease(dbh);
                    logger.debug("Transaction[%s] released", connId);
                    logger.log("Tranaction failed: %s", error);
                    throw error;
                }
            }, 
            (error) => {
                logger.log("Could not start transaction: %s", error);
                return Promise.reject("Could not start transaction");
            }
        )
    });
}

function createConnectionId() {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
}

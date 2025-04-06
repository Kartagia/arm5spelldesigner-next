import pg, { Connection, Pool, PoolClient, PoolOptions, QueryResult, QueryResultRow } from 'pg';

/**
 * The database connection module.
 * @module db
 */

/**
 * Create the authentication database.
 * @param dbh The database connection.
 * @returns The promise of the database handle with created tables.
 */
export function createAuthDatabase(dbh: PoolClient): Promise<PoolClient> {

    return dbh.query("CREATE TABLE IF NOT EXISTS auth_user ( id TEXT PRIMARY KEY, email varchar NOT NULL unique, displayName varchar(255), verified boolean default false, expires timestamp )").then(
        (result) => {
            return dbh;
    }).then(dbh => {
        return dbh.query("create table if not exists user_credentials (id text not null unique references auth_user(id) on update cascade on delete cascade, password varchar(1024) not null, salt varchar(255) not null, primary key (id))").then(
            (result) => {

                return dbh;
            }
        )
    }).then(dbh => {
        return dbh.query("create table if not exists user_session (id TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL, user_id TEXT NOT NULL REFERENCES auth_user(id) )").then(
            (result) => {
                return dbh;
            }
        )
    });
}



/**
 * Get the pool options for the authentication database.
 * @returns The pool options for authentication database.
 */
export function getAuthDabaseProperties(): Partial<PoolOptions> {

    return {
        database: process.env.AUTH_DATABASE,
        user: process.env.AUTH_USER,
        host: process.env.AUTH_HOST,
        port: Number(process.env.AUTH_PORT),
        password: process.env.AUTH_PASSWORD,
    };
}

/**
 * The connection pool for accessing authentication.
 */
const authPool = new pg.Pool(getAuthDabaseProperties());

/**
 * Create authentication session.
 * @eturns The authentication connection.
 */
export function createAuthConnection() {
    return authPool.connect();
}

/**
 * Get the pool options for the api database.
 * @returns The pool options for api database.
 */
export function getApiDatabaseProperties(): Partial<PoolOptions> {
    return {
        database: process.env.DATA_DATABASE,
        user: process.env.DATA_USER,
        host: process.env.DATA_HOST,
        port: Number(process.env.DATA_PORT),
        password: process.env.DATA_PASSWORD,
    };
}

/**
 * The database pool accessing the API data.
 */
const apiPool = new pg.Pool(getApiDatabaseProperties());

/**
 * Get the API connection.
 * @returns The API connection.
 */
export function createApiConnection() {
    return apiPool.connect();
}


/**
 * Create a new transaction.
 * @param pool The connection pool.
 * @returns The promise of a connection handling the transaction.
 */
export async function createTransaction(pool: Pool): Promise<PoolClient> {
    return await pool.connect().then(async (connection) => {
        await connection.query("start transaction");
        return connection;
    });
}

/**
 * Perform an api query. 
 * @param sql The SQL of the query.
 * @param params The parameters of the query.
 * @param transaction The optional transaction into which the query belongs.
 * Defaults to a new autocommitting transaction.
 * @returns The promise of the query result.
 */
export function apiQuery<RESULT extends QueryResultRow = any>(sql: string, params: any[], transaction: pg.PoolClient | undefined = undefined): Promise<QueryResult<RESULT>> {
    return new Promise(async (resolve, reject) => {
        const dbh = transaction ?? (await createTransaction(apiPool));
        try {
            const result: pg.QueryResult<RESULT> = await dbh.query(sql, params);
            if (!transaction) {
                await dbh.query("commit");
                dbh.release();
            }
            resolve(result);
        } catch (error) {
            await dbh.query("rollback");
            if (!transaction) {
                dbh.release();
            }
            reject(error);
        }

    })
}

/**
 * Perform an authentication query. 
 * @param sql The SQL of the query.
 * @param params The parameters of the query.
 * @param transaction The optional transaction into which the query belongs.
 * Defaults to a new autocommitting transaction.
 * @returns The promise of the query result.
 */
export function authQuery<RESULT extends QueryResultRow>(sql: string, params: any[], transaction: pg.PoolClient | undefined = undefined) {
    return new Promise(async (resolve, reject) => {
        const dbh = transaction ?? (await createTransaction(authPool));
        try {
            const result: pg.QueryResult<RESULT> = await dbh.query(sql, params);
            if (!transaction) {
                await dbh.query("commit");
            }
            resolve(result);
        } catch (error) {
            await dbh.query("rollback");
            reject(error);
        } finally {
            if (!transaction) {
                dbh.release();
            }
        }

    })

}
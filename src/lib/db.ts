"use server";
import { Client, escapeIdentifier, Pool, PoolClient, PoolOptions, QueryResult, QueryResultRow } from 'pg';

/**
 * The database connection module.
 * @module db
 */

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
const authPool = new Pool(getAuthDabaseProperties());

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
 * Create table.
 * @param dbh The database handle.
 * @param tableName The table name.
 * @param fields The fields of the created tables. 
 * @param constraints The constraints of the created tables. 
 * @returns The promise of completion. 
 */
export async function createTable(dbh: PoolClient | Client, tableName: string, fields: string[], constraints: string[] = []) {

    return dbh.query("begin").then(
        async () => {
            await dbh.query("create table if not exist " + escapeIdentifier(tableName) + "(" +
                [fields.join(","), constraints.join(",")].join(",")
                + ")");
            await dbh.query("commit");
        }

    ).catch(async err => {
        await dbh.query("rollback");
        throw err;
    });
}


/**
 * Create authentication tables.
 * @param dbh The database handle.
 * @param param1 The optiosn of the database creation.
 * @returns The promise of completion.
 */
export async function createAuthDb(dbh: PoolClient | Client, { clean = false, populate = false,
    userTable = "auth_user",
    credentialTable = "user_credentials",
    sessionTable = "user_session"
}: { clean?: boolean, populate?: boolean, userTable?: string, sessionTable?: string, credentialTable?: string } = {}) {

    return dbh.query("begin").then(
        async () => {
            const result = { created: 0, dropped: 0 }
            if (clean) {
                console.log("Cleaning up old database");
                await [["drop table if exists " + escapeIdentifier(userTable) + " cascade", userTable],
                ["drop table if exists " + escapeIdentifier(credentialTable), credentialTable],
                ["drop table if exists " + escapeIdentifier(sessionTable), sessionTable]
                ].forEach(async ([sql, tableName]) => {
                    console.log("Executing: ", sql);
                    result.dropped += (await dbh.query(sql).then(
                        (result) => {
                            console.debug("Dropped user table " + tableName);
                            return 0;
                        }, (err) => {
                            console.debug("Dropping table failed!");
                            throw err;
                        }));
                });
                console.log("Cleaning up completed with " + result.dropped + " tables removed");
            }
            result.created += (await dbh.query("create table if not exists " + escapeIdentifier(userTable) +
                "(" +
                ["id text primary key ",
                    "email varchar unique",
                    "displayName varchar(255)",
                    "verified boolean default false",
                    "expires timestamp without time zone"
                ].join(",") +
                ")").then((result) => {
                    console.log("Created table " + userTable);
                    return result.rowCount ?? 0;
                }, (err) => {
                    console.error("Could not create table", err);
                    throw err;
                }));
            console.log("Creating table %s", credentialTable);
            result.created += (await dbh.query("create table if not exists " + escapeIdentifier(credentialTable) +
                "(" +
                ["id text primary key references auth_user(id)", "password varchar(1024) not null", "salt varchar(255) not null"].join(",") +
                ")").then( (result) => {
                    return result.rowCount ?? 0;
                }));
            console.log("Creating table %s", sessionTable);
            result.created += (await dbh.query("create table if not exists " + escapeIdentifier(sessionTable) +
                "(" +
                ["id text primary key references auth_user(id)",
                    "expires_at timestamp with time zone not null",
                    "user_id text",
                    "api_key varchar(255) not null"].join(",") +
                ")").then( (result) => {
                    return result.rowCount ?? 0;
                }));
            console.log("Created all tables");

            if (populate) {
                // Populate the tables with defaults.
            }

            await dbh.query("commit");
            return Promise.resolve(`Created database: ${result.dropped} dropped, ${result.created} created`)
        }).catch(err => {

        });
}


/**
 * The database pool accessing the API data.
 */
const apiPool = new Pool(getApiDatabaseProperties());

export interface APIResource {

    /**
     * The resource name.
     */
    name: string;

    /**
     * The commands to create the resource;
     */
    create: (SqlCommand | string)[];

    /**
     * The commands to drop the resource. 
     */
    delete: (SqlCommand | string)[];

    /**
     * The sql commands to create initial content of the resource.
     */
    initial?: (SqlCommand | string)[];
}

interface SqlCommand {
    /**
     * Get the strign representation containing the SQL query.
     */
    toString(): string;

}

/**
 * A command for creating a table.
 */
interface CreateTable extends SqlCommand {

    /**
     * The table name.
     */
    readonly tableName: string;

    /**
     * The list of the table fields. 
     */
    readonly fields: readonly string[];

    /**
     * Th list fo the constraints.
     */
    readonly constraints: readonly string[];

    /**
     * Get the strign representation containing the SQL query.
     */
    toString(): string;
}

interface CreateView extends SqlCommand {

    /**
     * The view name.
     */
    readonly viewName: string;

    /**
     * The view query.
     */
    readonly query: string;

    /**
     * Get the strign representation containing the SQL query.
     */
    toString(): string;
}

/**
 * Create a create table command.
 * @param name The name of the table.
 * @param fields The fields of the table.
 * @param constraints The constraints of the table.
 * @returns The create table sql.
 */
function createTableSql(name: string, fields: string[] = [], constraints: string[] = []): CreateTable {

    return {
        tableName: name,
        fields,
        constraints,
        toString() {
            return "CREATE TABLE IF NOT EXISTS " + escapeIdentifier(this.tableName) + "(" +
                [...this.fields.map((sql) => (sql.toString())).join(", "), ...this.constraints.map((sql) => (sql.toString())).join(", ")].join(", ")
                + ")";
        }
    };
}

/**
 * Create a create view command.
 * @param name The name of the view.
 * @param query The SQL query creating the view.
 * @returns The create view sql.
 */
function createViewSql(name: string, sql: string): CreateView {
    return {
        viewName: name,
        query: sql,
        toString() { return "CREATE VIEW IF NOT EXISTS " + escapeIdentifier(this.viewName) + " AS " + this.query.toString(); }
    }
}

/**
 * The API resources and their database tables. 
 */
const apiResources: readonly APIResource[] = [
    { name: "guid", create: [createTableSql("guids", ["guid GUID primary key", "type varchar"], [])], delete: ["drop table if exists guids"] },
    {
        name: "arts", create: [createTableSql("arts", [], []), createTableSql("techniques"), [], [], createTableSql("forms", [], [])],
        delete: ["drop table if exists arts cascade"]
    },
    {
        name: "magic", create: [createTableSql("magicstyles", [], []), createTableSql("arts", [], []), createTableSql("techniques", [], []),
        createTableSql("forms", [], [])],
        delete: ["drop table if exists magicstyles", "drop table if exists arts cascade"]
    },
    {
        name: "spells", create: [

            createTableSql("spellguidelines", [], [])], delete: ["drop table if exists spellguidelines cascade"]
    },
];

/**
 * Get the API connection.
 * @returns The API connection.
 */
export function createApiConnection() {
    return apiPool.connect();
}

/**
 * Create API tables.
 * @param dbh The database handle.
 * @param param1 The optiosn of the database creation.
 * @returns The promise of completion.
 */
export async function createApiDb(dbh: PoolClient | Client, {
    all = false, clean = false, populate = false,
    resourceNames = []

}: {
    /**
     * Does the consruction create all API resources. 
     */
    all?: boolean,
    /**
     * The list of created API resources. 
     */
    resourceNames?: string[],
    /**
     * Does the operation perform clean build removing existing tables and views. 
     */
    clean?: boolean,
    /**
     * Does the operation populate the tables. 
     */
    populate?: boolean,
} = {}) {

    /**
     * The affected API resoures.
     */
    const resources = [...apiResources.filter((resource: APIResource) => (all || resource.name in (resourceNames ?? [])))];

    return dbh.query("begin").then(
        async () => {
            const result = { created: 0, dropped: 0 }
            if (clean) {
                console.log("Cleaning up old database");
                await Promise.all(resources.map(
                    (resource: APIResource) => {
                        Promise.all(resource.delete.map((sql) => (dbh.query(sql.toString()))));
                    }
                ));
                console.log("Cleaning up completed with " + result.dropped + " tables removed");
            }
            console.log("Creating new tables");
            await Promise.all(
                resources.map((resource) => (Promise.all(resource.create.map((sql) => (dbh.query(sql.toString()))))))
            );
            if (populate) {
                // Populate the tables with defaults.
                await Promise.all(
                    resources.map((resource) => (resource.initial ? Promise.all(resource.initial.map(
                        (sql) => (dbh.query(sql.toString())))) : Promise.resolve(`Resource ${resource.name} had no initial values`)))
                )
            }
            return Promise.resolve(`Created database: ${result.dropped} dropped, ${result.created} created`)
        }).catch(err => {

        });
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
export function apiQuery<RESULT extends QueryResultRow = any>(sql: string, params: any[], transaction: PoolClient | undefined = undefined): Promise<QueryResult<RESULT>> {
    return new Promise(async (resolve, reject) => {
        const dbh = transaction ?? (await createTransaction(apiPool));
        try {
            const result: QueryResult<RESULT> = await dbh.query(sql, params);
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
export function authQuery<RESULT extends QueryResultRow>(sql: string, params: any[], transaction: PoolClient | undefined = undefined) {
    return new Promise(async (resolve, reject) => {
        const dbh = transaction ?? (await createTransaction(authPool));
        try {
            const result: QueryResult<RESULT> = await dbh.query(sql, params);
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
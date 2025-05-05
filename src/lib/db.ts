import 'server-only';
import { Client, escapeIdentifier, escapeLiteral, Pool, PoolClient, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { getApiDatabaseProperties, getAuthDatabaseProperties, getTestAuthDatabaseProperties } from './dbConfig';
export { escapeIdentifier, escapeLiteral } from 'pg';
/**
 * The database connection module.
 * @module db
 */


/**
 * The not connected error.
 */
export const NOT_CONNECTED_ERROR = new Error("Not connected");

/**
 * The connection pool for accessing authentication.
 */
var authPool: Pool | undefined = undefined;
try {
    await initAuthPool((process.env.NODE_ENV === "test" ? getTestAuthDatabaseProperties() : getAuthDatabaseProperties()));
} catch (error) {
    console.error("Could not initialize authentication pool!", error);
}
/**
 * Initialize a connection pool.
 * @param config The configuration of the pool. An undefined configuration implies use of the current authentication pool, if any
 * exists.
 * @param defaultConfig The default configuration for the pool. 
 * @param current The current pool.
 * @returns If the configuration is defined, and the current pool is not ended pool, returns the current pool.
 * Otherwise returns a new pool created with configuration. 
 */
export function initPool(config: Partial<PoolConfig> | undefined = undefined, defaultConfig: PoolConfig, current?: Pool): Promise<Pool> {
    if (config != undefined || current === undefined || current.ended) {
        // Creating new pool replacing current pool and closing current pool.
        if (current) {
            return current.end().then(() => {
                return new Pool({ ...defaultConfig, ...(config ?? {}) });
            },
                (error) => {
                    console.error("%s: Closing old pool failed", (new Date()).toISOString());
                    return new Pool({ ...defaultConfig, ...(config ?? {}) });
                }
            );
        } else {
            return Promise.resolve(new Pool({ ...defaultConfig, ...(config ?? {}) }));
        }
    } else {
        return Promise.resolve(current);
    }
}

/**
 * Initialize the authentication pool.
 * @param config The configuration of the pool. An undefined configuration implies use of the current authentication pool, if any
 * exists.
 * @returns The promise of the assigned pool. 
 */
export async function initAuthPool(config: Partial<PoolConfig> | undefined): Promise<Pool> {
    return initPool(config, getAuthDatabaseProperties(), authPool).then(
        (result) => {
            authPool = result;
            return result;
        }
    )
}

/**
 * Create authentication session.
 * @eturns The authentication connection.
 */
export function createAuthConnection() {
    if (authPool) {
        return authPool.connect();
    } else {
        return Promise.reject(NOT_CONNECTED_ERROR);
    }
}

/**
 * Create table options.
 */
export interface CreateTableOptions extends TableOptions {

    /**
     * Does the cleanup cascade. 
     * @default false Cleanup is not cascading restricting cleanup.
     */
    cascade?: boolean;

    /**
     * Does the creation drop the table, if it exists.
     * @default false No clean creation is performed.
     */
    clean?: boolean;
}

/**
 * Create table.
 * @param dbh The database handle.
 * @param tableName The table name.
 * @param fields The fields of the created tables. 
 * @param constraints The constraints of the created tables. 
 * @returns The promise of completion. 
 */
export async function createTable(dbh: PoolClient | Client, tableName: string, fields: string[], constraints: string[] = [], options: CreateTableOptions = {}) {
    const { existing = true, cascade = false, clean = false } = options;

    if (clean) {
        // First lean the table.
        const groupEnd = console.group("Clean up %s", tableName);
        await dbh.query("drop table if exists " + escapeIdentifier(tableName) + (cascade ? " cascade" : " restrict")).then(
            (result) => {
                console.log("Table %s no longer exists", tableName);
                return result;
            },
            (error) => {
                console.log("Clean up failed due error %s", error);
                throw error;
            }
        ).finally(() => {
            console.groupEnd();
        })
    }

    console.group("creating table %s", tableName);
    const queryString = "create table " + (existing ? "if not exists " : "") + escapeIdentifier(tableName) +
        "(" +
        [...(fields.length ? fields : []), ...(constraints ? constraints : [])].join(",") +
        ")";
    console.log("createTable(%s):%s", tableName, queryString);
    await dbh.query(queryString).then((result) => {
        console.log("Success with %d rows", result.rowCount);
        return result;
    }, (error) => {
        console.error("Failure: %s", error);
        throw error;
    }
    ).finally(() => {
        console.groupEnd();
    });
}


/**
 * The options for drop table. 
 */
export interface TableOptions {
    /**
     * The command only affects existing tables ignoring non-existing tables.
     * @default true The default value is ignore existing tables.
     */
    existing?: boolean;
}

/**
 * The drop table options. 
 */
export interface DropTableOptions extends TableOptions {
    /**
     * Delete remove tables and views relying on the curren table.
     * @default false The default value does not remove tables and views relying on the table.
     */
    cascade?: boolean;
}

/**
 * Drop table.
 * @param dbh The database connection.
 * @param tableName The name of the dropped table.
 * @param options The options of the dropped table. 
 * @returns The propmise of completion. 
 */
export async function dropTable(dbh: PoolClient | Client, tableName: string, options: DropTableOptions) {
    const { existing = true, cascade = false } = options;
    const queryString = "drop table " + (options.existing ? "if exists " : "") + escapeIdentifier(tableName) +
        (cascade ? " cascade" : "");
    return dbh.query(queryString);
}



/**
 * Authentication database options.
 */
export interface AuthDbOptions {
    clean?: boolean;
    populate?: boolean;
    userTable?: string;
    sessionTable?: string;
    credentialTable?: string;
}

const defaultAuthDbOptions: Required<AuthDbOptions> = {
    clean: false, populate: false, userTable: "auth_user", credentialTable: "user_credentials",
    sessionTable: "user_session"
};

/**
 * Delete authentication database.
 * @param dbh The database handle.
 * @param options The autehntication database options. 
 */
export async function deleteAuthDb(dbh: PoolClient | Client, options: AuthDbOptions = {}): Promise<void> {
    const { clean, populate, userTable, credentialTable, sessionTable } = { ...defaultAuthDbOptions, ...options };

    if (clean) {
        // Delete the tables and views associated with them - the transaction is closed before this operation.
        await dbh.query("drop table if exists " + [escapeIdentifier(sessionTable), escapeIdentifier(userTable), escapeIdentifier(credentialTable)].join(",") + " cascade")
    } else {
        // Just delete the data. 
        await dbh.query("Trucate " + [escapeIdentifier(sessionTable), escapeIdentifier(userTable), escapeIdentifier(credentialTable)].join(",") + " cascade");
    }

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
}: AuthDbOptions = {}) {

    return dbh.query("begin").then(
        async () => {
            const result = { created: 0, dropped: 0 }
            if (clean) {
                console.log("Cleaning up old database");
                [
                    ["drop table if exists " + escapeIdentifier(userTable) + " cascade", userTable],
                    ["drop table if exists " + escapeIdentifier(credentialTable) + " cascade", credentialTable],
                    ["drop table if exists " + escapeIdentifier(sessionTable) + " cascade", sessionTable]
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
            result.created += (await dbh.query(
                "create table if not exists " + escapeIdentifier(userTable) + "(" +
                [
                    "id text primary key ",
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
            result.created += (await dbh.query(
                "create table if not exists " + escapeIdentifier(credentialTable) + "(" +
                [
                    "id text primary key references auth_user(id)",
                    "password varchar(1024) not null",
                    "salt varchar(255) not null"
                ].join(",") +
                ")").then((result) => {
                    return result.rowCount ?? 0;
                }));
            console.log("Creating table %s", sessionTable);
            result.created += (await dbh.query(
                "create table if not exists " + escapeIdentifier(sessionTable) + "(" +
                [
                    "id text primary key references auth_user(id)",
                    "expires_at timestamp with time zone not null",
                    "user_id text",
                    "api_key varchar(255) not null"].join(",") +
                ")").then((result) => {
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
var apiPool: Pool | undefined = undefined;

/**
 * Initialize the API pool.
 * @param config The configuration of the pool.
 * @returns The promise of the assigned pool. 
 */
export function initApiPool(config: Partial<PoolConfig> | undefined = undefined): Promise<Pool> {
    return initPool(config, getApiDatabaseProperties(), apiPool).then(
        (result) => {
            apiPool = result;
            return result;
        }
    );
}


/**
 * A API resource.
 */
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

    /**
     * The list of table names.
     */
    tables?: string[],

    /**
     * The list of view names.
     */
    views?: string[],

    /**
     * The list of API resource names the resource depends on. 
     * - Dependencies must be created before the dependency. 
     */
    dependency?: string[];

    /**
     * The sub resources of the resource in the order they should be created.
     * Sub resources are created after the main resource, and deleted with main resource.
     */
    subResources?: APIResource[];
}

/**
 * The search options for api resource search.
 */
interface ApiResourceSearchOptions {

    /**
     * Does the search check the sub modules too.
     */
    recurse?: boolean;

    /**
     * Does the search return the sub module with name.
     * This option has no effect, if recurse is false.
     */
    subModule?: boolean;
}

/**
 * Predicate testing a value.
 */
type Predicate<TYPE> = (tested: TYPE) => boolean;

/**
 * Predicate promising whether a value fulfils the predicate.
 */
type PromisedPredicate<TYPE> = (tested: TYPE) => Promise<boolean>;

/**
 * Create a promised predicate.
 * @param predicate The predicate converted to promised predicate.
 * @param rejectOnFailure Does the predicate reject on failure. If undefined, failure returns false.
 * @returns The promised predicate fulfilling the given predicate.
 */
function PromisedPredicate<TYPE, ERROR = any>(predicate: Predicate<TYPE>, rejectOnFailure: ERROR | undefined = undefined): PromisedPredicate<TYPE> {
    if (rejectOnFailure) {
        return async (tested: TYPE) => {
            if (predicate(tested)) {
                return true;
            } else {
                throw rejectOnFailure;
            }
        }
    } else {
        return async (tested: TYPE) => (predicate(tested));
    }
}

/**
 * Get api resource
 * @param resources The api resources.
 * @param seeked The name of the seeked value.
 * @param options The options of search.
 * @returns A promise of the first api resource fulfilling the requirements. 
 * @throws {"Not Found"} There was no api resource with given name.
 */
function getApiResources(resources: readonly APIResource[], seeked: string | Predicate<APIResource>, options: ApiResourceSearchOptions = {}): Promise<APIResource[]> {
    return new Promise(async (resolve, reject) => {
        const seekerFn: Predicate<APIResource> = typeof seeked === "string" ? (tested) => (tested.name === seeked) : seeked;
        const result = resources.filter(async (api) => (seekerFn(api) ||
            options.recurse && (api.subResources && await getApiResource(api.subResources, seekerFn).then(
                () => (true),
                () => (false)
            ))));
        if (options.subModule) {
            // Seeking the actual module fulfilling the predicate.
            const flatten = async function <TYPE>(result: Promise<TYPE[]>, subResult: Promise<TYPE[]>, index: Number, array: Promise<TYPE[]>[]) {
                return result.then(async (all) => { all.push(...(await subResult)); return all });
            };

            const seekSubModules = async (cursor: APIResource, seeker: Predicate<APIResource>): Promise<APIResource[]> => {
                if (seekerFn(cursor)) {
                    return [cursor];
                } else if (cursor.subResources) {
                    return await cursor.subResources.flatMap(async (resource) => await seekSubModules(resource, seekerFn)).reduce(
                        flatten,
                        Promise.resolve([])
                    );
                } else {
                    return [];
                }
            }
            resolve(result.flatMap(async (resource) => await seekSubModules(resource, seekerFn)).reduce(
                flatten, Promise.resolve([])
            ));
        } else {
            // Resolve the reult as it is.
            resolve(result);
        }
    });
}

/**
 * Create dependencies. If created is given, no dependency in the list is created.
 * @param dbh The database handle handling the dependency creation.
 * @param resource The resource, whose dependencies.
 * @param ignored The previously created resources.
 * @returns The promise of ignored modules after the dependency creation.
 */
async function createDependencies(dbh: PoolClient | Client, resource: APIResource, ignored?: string[]): Promise<string[]> {
    const created = [...(ignored ?? [])];
    if (resource.dependency) {
        /*
         * Use of the for is necessary to ensure a dependency is created before
         * its successor dependencies are created. 
         */
        for (const dependency in (resource.dependency.filter((item) => !(item in created)))) {
            await getApiResource(apiResources, dependency).then(
                (dep) => (createApiResource(dbh, dep).then(() => {
                    created.push(dependency);
                }))
            ).catch((err) => {
                return Promise.reject("Could not create dependency " + dependency)
            })
        }
        return created;
    } else {
        return created;
    }
}

/**
 * Create an api resource.
 * @param dbh The database connection handling the query.
 * @param resource The resource created.
 * @param seeker The predicate selecting created api resources. 
 * @returns Promise of completion.
 */
async function createApiResource(dbh: PoolClient | Client, resource: APIResource | Promise<APIResource>, seeker: Predicate<APIResource> = () => true): Promise<void> {
    const options = { clean: false, populate: false };
    const connection = createApiConnection();
    if (resource instanceof Promise) {
        return resource.then(
            async (created) => {
                return createApiResource(dbh, created, seeker);
            }
        )
    } else {
        try {
            // Create dependencies.
            let ignored = createDependencies(dbh, resource);
            return connection.then(async (dbh) => {
                if (options.clean) {
                    for (const command in resource.delete) {
                        await dbh.query(command.toString());
                    }
                }
                for (const command in resource.create) {
                    await dbh.query(command.toString());
                }
                if (options.populate) {
                    for (const command in resource.initial) {
                        await dbh.query(command.toString());
                    }
                }
            })
        } catch (err) {
            return Promise.reject(err);
        }
    }
}

/**
 * Get api resource
 * @param resources The api resources.
 * @param seeked The name of the seeked value.
 * @param options The options of search.
 * @returns A promise of the first api resource fulfilling the requirements. 
 * @throws {"Not Found"} There was no api resource with given name.
 */
function getApiResource(resources: readonly APIResource[], seeked: string | Predicate<APIResource>, options: ApiResourceSearchOptions = {}): Promise<APIResource> {
    return new Promise(async (resolve, reject) => {
        const seekerFn: Predicate<APIResource> = typeof seeked === "string" ? (tested) => (tested.name === seeked) : seeked;
        const result = resources.find(async (api) => (seekerFn(api) ||
            options.recurse && (api.subResources && await getApiResource(api.subResources, seekerFn).then(
                (found) => (true),
                () => (false)
            ))));
        if (result) {
            let cursor = result;
            if (options.subModule) {
                while (seekerFn(cursor)) {
                    cursor = await getApiResource(cursor.subResources ?? [], seekerFn);
                }
            }
            resolve(cursor);
        } else {
            reject("Not found");
        }
    });
}

/**
 * A sql command.
 */
export interface SqlCommand {
    /**
     * Get the strign representation containing the SQL query.
     */
    toString(): string;

}

/**
 * A command for creating a table.
 */
export interface CreateTable extends SqlCommand {

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

/**
 * Command to create a view.
 */
export interface CreateView extends SqlCommand {

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
export function createTableSql(name: string, fields: string[] = [], constraints: string[] = [], options: CreateTableOptions = {}): CreateTable {
    const { cascade = false, clean = false, existing = true } = options;
    return {
        tableName: name,
        fields,
        constraints,
        toString() {
            return "CREATE TABLE " + (existing ? "IF NOT EXISTS " : "") + escapeIdentifier(this.tableName) + "(" +
                [
                    ...this.fields.map((sql) => (sql.toString())),
                    ...this.constraints.map((sql) => (sql.toString()))
                ].join(", ") +
                ")";
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
    {
        name: "guid",
        create: [
            createTableSql("guids", ["guid GUID primary key", "type varchar", "id integer", "starttime varchar(11)"], []),
            createViewSql("temporary_guids", "select * from guids WHERE id is null or starttime is null"),
            createViewSql("permanent_guids", "select * from guids WHERE id is not null and starttime is not null")
        ],
        delete: ["drop table if exists guids cascade"],
        tables: ["guids"],
        views: ["temporary_guids", "permanent_guids"]
    },
    {
        name: "magic",
        create: [createTableSql("magicstyles", [], [])],
        delete: ["drop table if exists magicstyles cascade"],
        tables: ["magicstyles"],
        views: [],
        dependency: ["guid"],
        initial: [
            "insert into magicstyles(name) values ('Hermetic')"
        ],

        subResources: [
            {
                name: "arts", create: [
                    createTableSql("arts", ["id smallserial primary key", "name character varyign(20) not null", "abbrev character varyign(5) not null"], []),
                    createTableSql("techniques", ["art_id smallint not null references arts(id) on update cascade on delete cascade",
                        "style_id smallint not null references magicstyles(id) on update cascade on delete cascade"], ["primary key (art_id, style_id)"]),
                    createTableSql("forms", ["art_id smallint not null references arts(id) on update cascade on delete cascade",
                        "style_id smallint not null references magicstyles(id) on update cascade on delete cascade"], ["primary key (art_id, style_id)"]),
                    createTableSql("spell_guidelines", ["level varchar(3) not null",
                        "style_id smallint not null default 1 references magicstyles(id) on update cascade on delete cascade",
                    ], []),
                    createViewSql(
                        "api_arts_view",
                        "SELECT guids.id, guids.guid, guids.type, guids.starttime, arts.name, arts.abbrev " +
                        "FROM ((SELECT guids, id) from public.guids WHERE type like 'art.%') guids JOIN public.arts USING (id))"
                    ),
                    createViewSql(
                        "formview",
                        "select forms.art_id, forms.style_id, arts.anme as art, arts.abbrev, magicstyles.name as style " +
                        "from (" +
                        "(" +
                        "public.forms JOIN public.arts ON (" +
                        "( forms.art_id = arts.id)" +
                        ")" +
                        ") join public.magicstyles ON (" +
                        "(forms.style_id = magicstyles.id)" +
                        ")" +
                        ")"
                    ),
                    createViewSql(
                        "techniqueview",
                        "select techniques.art_id, techniques.style_id, arts.anme as art, arts.abbrev, magicstyles.name as style " +
                        "from (" +
                        "(" +
                        "public.techniques JOIN public.arts ON (" +
                        "( techniques.art_id = arts.id)" +
                        ")" +
                        ") join public.magicstyles ON (" +
                        "(techniques.style_id = magicstyles.id)" +
                        ")" +
                        ")"
                    ),
                    createViewSql("arts_view",
                        "select formview.art_id, formview.style_id, formview.art, formview.abbrev, formview.style, 'Form'::text as type from formview " +
                        "UNION " +
                        "select techniqueview.art_id, techniqueview.style_id, techniqueview.art, techniqueview.abbrev, techniqueview.style, 'Technique'::text as type from techniqueview "
                    )
                ],
                delete: ["drop table if exists arts cascade", "drop table if exists forms cascade", "drop table if exists techniques cascade"],
                tables: ["arts", "forms", "techniques"],
                views: [
                    "formview", "techiniqueview", "arts_view"
                ],
                initial: [
                    // Create hermetic techniques by adding them first into arts and then to techniques.
                    /** @todo Replace array of technique names with parameter  */
                    "WITH created as (" +
                    "INSERT INTO arts(name, abbrev) VALUES " +
                    ["Creo", "Intellego", "Muto", "Perdo", "Rego"].map((name) => (`(${escapeLiteral(name)}, ${escapeLiteral(name.substring(0, 2))})`)).join(",") +
                    " RETURNING id" +
                    ") " +
                    "INSERT INTO techniques(art_id, style_id) SELECT created.id as art_id, styles.id as style_id FROM " +
                    "created, magicstyles WHERE name='Hermetic'",
                    // Create hermetic forms by adding them first into arts and then to forms.
                    /** @todo Replace array of form names with parameter  */
                    "WITH created as (" +
                    "INSERT INTO arts(name, abbrev) VALUES " +
                    ["Animal", "Aquam", "Auram", "Ignem", "Terram"].map((name) => (`(${escapeLiteral(name)}, ${escapeLiteral(name.substring(0, 2))})`)).join(",") +
                    " RETURNING id" +
                    ") " +
                    "INSERT INTO forms(art_id, style_id) SELECT created.id as art_id, styles.id as style_id FROM " +
                    "created, magicstyles WHERE name='Hermetic'",
                    // Add guids to created forms.
                    "INSERT INTO guids(guid, type, id, starttime) " +
                    "SELECT gen_random_uuid() as guid, 'art.form' as type, art_id::int as id, '0767-01-01' as starttime FROM forms WHERE id NOT IN (SELECT art_id FROM guids)",
                    // Add guids to created techniques.
                    "INSERT INTO guids(guid, type, id, starttime) " +
                    "SELECT gen_random_uuid() as guid, 'art.technique' as type, art_id::int as id, '0767-01-01' as starttime FROM techniques WHERE art_id NOT IN (SELECT id FROM guids)",
                ]

            },
        ]
    },
    {
        name: "spellguidelines",
        create: [
            createTableSql(
                "spell_guidelines", [
                "id serial primary key",
                "level varchar(10) not null",
                "style_id smallint NOT NULL",
                "technique_id smallint NOT NULL",
                "form_id smallint NOT NULL",
                "name varchar(255) not null",
                "description text"
            ], [
                "unique (level, style_id, technique_id, form_id, name)",
                "foreign key (style_id, technique_id) REFERENCES techniques(style_id, art_id) on update cascade on delete cascade",
                "foreign key (style_id, form_id) REFERENCES forms(style_id, art_id) on update cascade on delete cascade",
            ]),
            createViewSql(
                "guidelinesview",
                "SELECT " +
                [
                    ...["style_id", "form_id", "technique_id", "level", "name", "description"].map(name => (`spell_guidelines.${name}`)),
                    ...["style", "form"].map(name => (`form.${name}`)),
                    ...["technique"].map(name => (`technique.${name}`))
                ].join(", ") + " " +
                "FROM (" +
                "public.spell_guidelines JOIN (" +
                "(" +
                "SELECT formview.style_id, formview.art_id as form_id, formview.style, formview.art as form " +
                "FROM public.formview" +
                ") form JOIN (" +
                "SELECT techniqueview.style_id, techniqueview.art_id as technique_id, techniqueview.style, techniqueview.art as technique " +
                "FROM public.techniqueview" +
                ") technique USING (style_id, style)" +
                ") USING (style_id, technique_id, form_id)" +
                ")" +
                "ORDER BY style, form, technique, level, name"
            ),
            createViewSql(
                "invalid_guidelines",
                "select distinct level, form_id, technique_id, name, form.style_id as form_style_id, technique.style_id as technique_style_id from " +
                "(" +
                "spell_guidelines join formview as form ON spell_guidelines.form_id = form.art_id" +
                ") JOIN techniqueview as technique ON technique.art_id = technique_id WHERE NOT form.style_id = technique.style_id"
            )
        ],
        delete: ["drop table if exists spell_guidelines cascade"],
        dependency: ["arts"]
    },
    {
        name: "rdts",
        create: [
            createTableSql("rdts", [
                "id serial primary key",
                "modifier smallint default '0'",
                "name varchar(80) not null",
                "type varchar(80)",
                "description text"
            ], ["unique(name, type)"]),
            createTableSql("secondaryRdts",
                [
                    "parent_id smallint not null references rdts(id) on update cascade on delete cascade",
                    "rdt_id smallint not null references rdts(id) on update cascade on delete cascade"
                ],
                ["primary key (parent_id, rdt_id), check noSelfRef (not parent_id = rdt_id)"]
            ),
            createViewSql("ranges", "select * from rdts where type = 'range' or type like 'range.%' order by modifier, type"),
            createViewSql("durations", "select * from rdts where type = 'duration' or type like 'duration.%' order by modifier, type"),
            createViewSql("targets", "select * from rdts where type = 'target' or type like 'target.%' order by modifier, type"),
            createViewSql(
                "api_rdts_secondary",
                "select guids.guid, concat(guids.type, '.', rdts.type) as type, modifier, rdts.name, description, secondaryRdt " +
                "from (select * from guids where type like 'rdt.%' or type = 'rdt') guids join rdts using(id) left outer " +
                "JOIN (" +
                "   SELECT guid as secondaryRdt, parent_id from secondaryrdts JOIN guids on rdt_id = id WHERE guids.type like 'rdt.%'" +
                ") secondary ON rdts.id = secondary.parent_id"),
            createViewSql("api_rdts",
                "(" +
                // The api_rdts with secondary rdts. 
                "select guid, type, modifier, name, description, array_agg(secondaryrdt) as secondaryRDTs " +
                "from api_rdts_secondary where secondaryrdt is not null group by guid,type, modifier,name,description " +
                ") union (" +
                // The api_rdts without secondary rdts.
                "select guid, type, modifier, name, description, null as secondaryRDTs from api_rdts_secondary where secondaryrdt is null" +
                ")"
            ),
            createViewSql("api_ranges",
                "select * from api_rdts where type like 'rdt.range.%' or type = 'rdt.range'"
            ),
            createViewSql("api_durations",
                "select * from api_rdts where type like 'rdt.duration.%' or type = 'rdt.duration'"
            ),
            createViewSql("api_target",
                "select * from api_rdts where type like 'rdt.target.%' or type = 'rdt.target'"
            )
        ],
        delete: [
            ...["rdts", "secondaryRDTs"].map((tableName) => (`drop table if exists ${escapeIdentifier(tableName)} cascade`)),
            ...["ranges", "durations", "targets", "api_rdts_secondary", "api_rdts"].map((viewName) => (
                `drop view if exists ${escapeIdentifier(viewName)} cascade`
            ))
        ],
        dependency: [
            "guids"
        ]
    },
    {
        name: "spells",
        create: [
            createTableSql("spells", [
                "guideline_id int references spell_guidelines(id) on update cascade on delete cascade",
                "id serial",
                "level smallint default null"
            ], ["unique (id, level)"]),
            createTableSql("spell_ranges",
                [
                    "range_id smallint not null references rdts(id) on update cascade on delete cascade",
                    "spell_id int not null references spells(id) on update cascade on delete cascade"
                ], ["primary key (range_id, spell_id)"])
        ],
        delete: ["drop table if exists spells"],
        dependency: [
            "spellguidelines",
            "rdts",
            //"tags" -- tags is implemented later.
        ]
    },
];

/**
 * Get the API connection.
 * @returns The API connection.
 */
export function createApiConnection() {
    if (apiPool) {
        return apiPool.connect();
    } else {
        return Promise.reject("Not initialized");
    }
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
            resources.forEach(
                async (resource) => {
                    console.group("Creating resource %s", resource);
                    try {
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
                    } finally {
                        // Close the group. 
                        console.groupEnd();
                    }
                });
            return Promise.resolve(`Created database: ${result.dropped} dropped, ${result.created} created`)
        }).catch(async err => {
            await dbh.query("rollback");
            throw err;
        })
}

export async function deleteApiDb(dbh: PoolClient | Client, {
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
        if (apiPool) {
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

        } else {
            reject(NOT_CONNECTED_ERROR);
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
        if (authPool) {
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
        } else {
            reject("NOT_CONNECTED_ERROR");
        }
    })

}

/**
 * The constraint indicating all fields are listed.
 */
export const ALL_FIELDS = "*";
/**
 * The type of the all fields. 
 */
export type ALL_FIELDS = typeof ALL_FIELDS;

/**
 * The Where constraints.
 */
export type WhereConstraints = string[];
/**
 * The group by constraints.
 */
export type GroupConstraints = string[];
/**
 * The order constraints.
 */
export type OrderConstraints = string[];

/**
 * Select constraints. 
 */
export type SelectConstraints = [WhereConstraints?, GroupConstraints?, OrderConstraints?];
/**
 * Create select query from a table.
 * @param dbh The database handle used for operation.
 * @param tableName The table name. 
 * @param fields The retrieved field definitions.
 * @param constriants The constraints of the query.
 * @param options The table options.
 * @returns The result of the selection.
 */
export function selectTable(dbh: PoolClient | Client, tableName: string, fields: string[] | ALL_FIELDS, constriants: SelectConstraints, options: TableOptions = {}) {

    let selectSql = "SELECT " + (Array.isArray(fields) ? fields.map((field) => (field.toString())).join(", ") + " " : fields) +
        "FROM " + escapeIdentifier(tableName) +
        (constriants[0] ? "WHERE " + constriants[0]?.join(" AND ") + " " : "") +
        (constriants[1] ? "GROUP BY " + constriants[1]?.map(constraint => escapeIdentifier(constraint))?.join(", ") + " " : "") +
        (constriants[2] ? "ORDER BY " + constriants[2]?.join(", ") + " " : "");

    return dbh.query(selectSql);
}

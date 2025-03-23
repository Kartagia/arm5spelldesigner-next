
import { BasicDao, Dao } from "./dao";
import { Client, Configuration, connect, ConnectionInfo, DataType, Query, Result, ResultIterator, ResultRecord } from 'ts-postgres'
import { EntryFilter, Identified } from "./utils";
import { createPool, Pool } from "generic-pool";

/**
 * Query with parameter handling embedded.
 */
interface QueryWithParams<TYPE, ID = bigint> extends Query {

    /**
     * The parameter count of a number.
     * @default 0 The default is no parameters.
     */
    paramCount?: number;

    /**
     * Get the source parameter value.
     * @param source The source object.
     * @param index The parameter index.
     * @returns The source parameter value used in query.
     */
    getSourceParam(source: TYPE, index: number): DataType | undefined;

    /**
     * The parameters of the call.
     */
    params?: (undefined | DataType)[]
}

/**
 * Create a query with parameters.
 * @param query The query.
 * @param source The source object of the query.
 * @param params The parameters of the query. An undefined values
 * are replaced with source object derived values.
 * @param evaluators The evaluators evaluating the parameter at the same index
 * from source object. Absent functions defaults to an undefined value returning
 * funciton. The data type values indicats the value is always returned.
 */
export function createQueryParams<TYPE, ID = bigint>(
    query: Query,
    source?: TYPE,
    params: (undefined | DataType)[] = [],
    evaluators: (((source: TYPE) => DataType | undefined) | DataType | undefined)[] = []
): QueryWithParams<TYPE, ID> {

    const result: QueryWithParams<TYPE, ID> = {
        ...query,
        get paramCount() {
            return params.length;
        },
        getSourceParam(source: TYPE, index: number): DataType | undefined {
            if (index >= 0 && index < (this.paramCount || 0) && index <= evaluators.length) {
                const evaluator = evaluators[index];
                if (typeof evaluator === "function") {
                    return evaluator(source);
                } else {
                    return evaluator;
                }
            }
            return undefined;
        },
        get params(): (undefined | DataType)[] {
            return params.map((value, index) => {
                if (index < 0) {
                    return undefined;
                } else if (index >= (this.paramCount || 0)) {
                    return undefined;
                } else {
                    const param = params[index];
                    if (param !== undefined) {
                        // Actual value.
                        return param;
                    } else if (index < evaluators.length) {
                        const evaluator = evaluators[index];
                        if (typeof evaluator === "function") {
                            if (source === undefined) {
                                return undefined;
                            } else {
                                return this.getSourceParam(source, index);
                            }
                        } else {
                            return evaluator;
                        }
                    } else {
                        return undefined;
                    }
                }
            });
        }
    };
    return result;
}

/**
 * The dao database declaration.
 */
export interface DbDaoProps<TYPE, ID = bigint> {

    /**
     * The sql command to get all.
     */
    getAllSql: string | Query | Query[];

    /**
     * The function evaluating et all resutls into array results.
     */
    getAllEvaluator: ((rows: ResultRecord<any>[] |ResultRecord<any>) => Identified<TYPE, ID>[])

    /**
     * The sql command to get one entry.
     */
    getOneSql?: string | Query;

    /**
     * The evaluator of one result.
     */
    getOneEvaluator?: ((rows: ResultRecord<any>[] | ResultRecord<any>) => TYPE)

    /**
     * The sql command to update one entry.
     * If this value is undefined, the update is not supported.
     */
    updateSql?: string | Query;

    /**
     * The sql command to delete one entry.
     * If the value is undefined, the delete is not supported.
     */
    deleteSql?: string | Query;

    /**
     * The sql command to create one entry.
     * If the valeu is undefined, the insertiong of new entries is not
     * supported.
     */
    createSql?: string | Query;

    /**
     * The database handle for operating the database.
     */
    dbh?: Client;

    /**
     * The connection info used to create new database conneciton.
     */
    connection?: Configuration;

    /**
     * The filters of the query.
     */
    filters(): string[];


    /**
     * The client pool. 
     */
    pool?: Pool<Client>;
}

/**
 * Database accessing dao.
 */
export class DbDao<TYPE, ID = bigint> extends BasicDao<TYPE, ID> {

    private pool;

    private client: () => Promise<Client>;

    constructor(props: DbDaoProps<TYPE, ID>) {
        const filters = props.filters;

        const getAll = (
            Array.isArray(props.getAllSql) ?
                () => {
                    return new Promise<Identified<TYPE, ID>[]>((resolve, reject) => {

                    this.query("begin");
                    const results = (props.getAllSql as Query[]).map(
                        query => (this.query<ResultRecord<any>>(query))
                    )
                    this.query("commit").then(
                        result => {
                            Promise.all(results).then(
                                res => {
                                    resolve(props.getAllEvaluator(res))
                                }
                            )
                        }
                    )
                })
            }
            : () => {
                return new Promise<Identified<TYPE, ID>[]>((resolve, reject) => {
                    if (!Array.isArray(props.getAllSql)) {
                        this.query<any>(props.getAllSql).then(
                            (result) => { resolve(props.getAllEvaluator(result))}
                        )    
                    }
                })
            }
        );
        const getSome = (filter: EntryFilter<TYPE, ID>) => {
            return getAll().then((results) => (results.filter(
                (entry) => (filter(entry.id, entry.value)))));
        }

        const update = (id: ID, value: TYPE) => {
            return new Promise<boolean>((resolve, reject) => {

            });
        }

        const removeOne = (id: ID) => {
            return new Promise<boolean>((resolve, reject) => {

            });
        }

        const getOne = (id: ID) => {
            return new Promise<TYPE>((resolve, reject) => {
                if (props.getOneSql) {
                    this.query(props.getOneSql).then(

                    )
                } else {

                }
            })
        }

        super({
            getAll, getSome,
            update: props.updateSql ? update : undefined,
            delete: props.deleteSql ? removeOne : undefined,
            get: props.getOneSql ? getOne : undefined
        });

        this.pool = props.pool || createPool(
            {
                create: async () => {
                    const client = await connect(props.connection);
                    client.on('error', console.log);
                    return client;
                },
                destroy: (client: Client) => client.end(),
                validate: async (client: Client) => !client.closed
            }
        );
        this.client = props.dbh !== undefined ? (() => (Promise.resolve(props.dbh as Client))) : (() => (this.pool.acquire()));
    }

    query<T=ResultRecord<any>>(query: string | Query, values?: any[]): Promise<Result<T>> {
        return new Promise( (resolve, reject) => {
            this.client().then( (dbh) => (dbh.query<T>(query, values))).then(
                (result) => {
                    resolve(result);
                }
            )
        })
    }

    queryTransaction<RESULT,T=ResultRecord<any>>(
        queries: (string | Query)[],
        values: (any[] | undefined)[],
        combiner: ((source: T[]) => RESULT)
    ) {
        return new Promise<T[]>((resolve, reject) => {
            try {
                Promise.all(
                    queries.map((query, index) => (this.query<T>(query, values[index])))
                ).then( results => (results));
            } catch (error) {
                reject(error);
            }
        }).then((results) => (combiner(results)));
    }
}
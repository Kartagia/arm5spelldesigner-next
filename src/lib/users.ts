
import { createAuthConnection, escapeIdentifier, escapeLiteral } from '@/lib/db';
import { setPassword, Credentials, validEmail, checkUserPassword } from './auth';
import { PoolClient } from 'pg';
import logger = console;
import { Session } from 'lucia';

/**
 * Users module for handling users. 
 * @module users
 */

/**
 * The user configuration.
 */
export interface UserConfig {

    /**
     * The user expiration time in days.
     */
    userExpiration: number;
}

const config : UserConfig = {
    userExpiration: 90
}

/**
 * The user information. 
 */
export interface UserInfo {

    /**
     * The email address of the user.
     */
    email: string;

    /**
     * The display name of the user.
     * @default this#email The email address of the user.
     */
    displayName?: string;

    /**
     * The global user identifier. 
     */
    id: string;

    /**
     * Is the account email verified. 
     */
    verified?: boolean;

    /**
     * Has the account expired.
     */
    expired?: boolean;
}

export async function loginUser(email: string, password: string): Promise<UserInfo> {
    if (!validEmail(email)) {
        return Promise.reject(new SyntaxError("Invalid email address"));
    }

    return await createAuthConnection().then( 
        async (dbh) => {
            return dbh.query<UserInfo>("SELECT id, email, displayName, verified, expires FROM auth_user  WHERE email=$1 AND expires > NOW()",
                [email]
            ).then( async (result) => {
                if (result.rowCount === 0) {
                    // Not found.
                    throw new Error("Not Found");
                } else {
                    // Validating the user. 
                    const userInfo = result.rows[0];
                    return dbh.query<Credentials>("SELECT password, salt FROM user_credentials WHERE id=$1", [userInfo.id])
                    .then( 
                        (credentials) => {
                            return (checkUserPassword(credentials.rows[0].password, password, credentials.rows[0].salt)).then(
                                (valid) => {
                                    if (valid) {
                                        return userInfo;
                                    } else {
                                        throw new Error("Forbidden");
                                    }
                                }, 
                                () => {
                                    throw new Error("Unaouthorized");
                                }
                            )
                    });
                }
            })
        }
    );
}

/**
 * Create a new user.
 * @param details The user details.
 * @param credentials The user credentials.
 * @returns The promsie of completion.
 */
export async function createUser(details: Omit<UserInfo, "id">, credentials: Omit<Credentials, "id" | "salt">): Promise<string> {

    return new Promise(async (resolve, reject) => {
        const dbh = await createAuthConnection();
        await dbh.connect();
        try {
            var id = crypto.randomUUID();
            await dbh.query("start transaction");
            await dbh.query("insert into auth_user (id, email, displayname, verified, expires) values ($1, $2, $3, $4, NOW() + INTERVAL '$5 DAYS')",
                [
                    id, details.email, details.displayName, details.verified ?? false,
                    Math.max(0, config.userExpiration)
                ]);
            await setPassword(id, credentials.password, dbh);
            await dbh.query("commit");
            resolve(id);
        } catch (error) {
            /**
             * @todo Error handling returning standardized error as rejection.
             */
            throw error;
        } finally {
            dbh.release();
        }
    });
}

/**
 * Get user information.
 * @param userId The user, whose information is queried.
 * @returns The user information of the given user.
 */
export async function getUserInfo(userId: string, transaction: PoolClient | undefined = undefined): Promise<UserInfo> {
    const result = (transaction ? Promise.resolve(transaction) : createAuthConnection()).then(
        async (dbh) => {
            const result = await dbh.query<UserInfo>(
                "SELECT id, displayName, email, verified, expires <= NOW() as expired FROM auth_user WHERE id=$1", [userId]);
            if (result.rowCount !== null && result.rowCount > 0) {
                if (result.rowCount > 1) {
                    logger.warn(`UserId[${userId}] has ${result.rowCount} authentication rows`);
                }
                const row = result.rows[0];
                const userInfo = {
                    id: row.id,
                    email: row.email,
                    verified: row.verified ?? false,
                    expired: row.expired ?? true
                }; 
                if (!transaction) {
                    dbh.release();
                }
                return userInfo;
            } else {
                if (!transaction) {
                    dbh.release();
                }
                throw new Error("No such user exists");
            }
        }
    ).catch(error => { throw error });
    return result;
}

/**
 * Set user password.
 * @param userId The user identifier.
 * @param password The password.
 */
export async function setUserPassword(userId: string, password: string): Promise<void> {
    return createAuthConnection().then( async dbh => {
        try {
            await dbh.query("start transaction");
            await setPassword(userId, password, dbh);
            updateUser({id: userId}, dbh);
            await dbh.query("commit");
        } catch( err) {
            await dbh.query("rollback");
            throw err;
        }
    });
}

/**
 * Update user information.
 * @param details De user details.
 * @param transaction Teh transaction used instead of new connection.
 * @returns The promise of completion. 
 */
export async function updateUser(details: Partial<Omit<UserInfo, "expired">>, transaction: PoolClient|undefined = undefined): Promise<void> {
    if (details.id == undefined) {
        return Promise.reject(new Error(`User identifier is required for update`));
    } else if (Object.keys(details).length === 1) {
        // Updating expiration only. 
        return (transaction ? Promise.resolve(transaction) : 
        createAuthConnection().then( async (dbh) => {
            await dbh.query("begin");
            return dbh;
        })).then(
            dbh => {
                dbh.query("UPDATE auth_user SET expires = NOW + INTERVAL '$1 DAYS' WHERE id=$2", [Math.max(0, config.userExpiration), details.id]);
            }
        );
    } else {
        return new Promise(async (resolve, reject) => {
            (transaction ? Promise.resolve(transaction) : 
            createAuthConnection().then( async (dbh) => {
                await dbh.query("begin");
                return dbh;
            })).then(
                async dbh => {
                    const [fields, values]: [(keyof typeof details)[], any[]] = (Object.keys(details) as (keyof typeof details)[]).reduce( 
                        (result: [(keyof typeof details)[], any[]], key: keyof typeof details, index:number) => {
                        if (key !== 'id' && key in details) {
                            result[0].push(key);
                            result[1].push(details[key]);
                        }
                        return result;
                    }, [[], []] as [(keyof typeof details)[], any[]]);
                    const result = dbh.query(`UPDATE auth_user SET expires = NOW() + INTERVAL '$1 days' AND ${ fields.map( 
                        (field: keyof UserInfo, index: number) => (`${escapeIdentifier(field)}=$${index+2}`) 
                    ).join(" AND ")} WHERE id=$${fields.length+2}`, [
                        Math.max(0, config.userExpiration), ...values, details.id
                    ]);
                    if (!transaction) {
                        // Closing transaction.
                        await dbh.query("commit");
                        dbh.release();
                    }
                    return result;
                }
            )
        });
    }
}

/**
 * Remove an existing user.
 * @param details The user details.
 * @returns The promise of completion.
 */
export async function deleteUser(details: UserInfo, transaction: PoolClient|undefined = undefined): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const dbh = transaction ?? await createAuthConnection();
        if (!transaction) {
            await dbh.query("begin");
        }
        const userInfo = await getUserInfo(details.id, dbh);
        return await createAuthConnection().then(
            (dbh) => {
                return dbh.query("DELETE FROM auth_user WHERE id=$1", [details.id]);
            }
        ).then( (result) => {
            if (!transaction) {
                dbh.query("commit");
                dbh.release();
            }
            return result;
        })
    });
}
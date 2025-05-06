
import { createAuthConnection, escapeIdentifier } from '@/lib/db';
import { setPassword, Credentials, checkUserPassword, hashPassword } from './auth';
import { PoolClient, DatabaseError } from 'pg';
import logger = console;
import { Session } from 'lucia';
import { timingSafeEqual } from 'node:crypto';
import { sessionTimeout } from './dbConfig';

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

const config: UserConfig = {
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
    return await createAuthConnection().then(
        async (dbh) => {
            return dbh.query(
                "select id, email, displayname, verified, expires <= NOW() as expired, "+
                "password, salt "+
                "from auth_user NATURAL JOIN user_credentials where email=$1 AND expires > NOW()",
                // "SELECT json_build_object(id, email, displayName, verified, expires FROM auth_user NATURAL JOIN user_credentials  WHERE email=$1 AND expires > NOW()",
                [email]
            ).then(async (result) => {
                if (result.rowCount === 0) {
                    // Not found.
                    throw new Error("Not Found");
                } else {
                    // Validating the user. 
                    return {userInfo: {...result.rows[0], password: undefined, salt: undefined}, 
                    row: {password: result.rows[0].password, salt: result.rows[0].salt}, 
                    hash: await hashPassword(password.normalize(), result.rows[0].salt)};
                }
              },
                (error) => {
                    throw error;
                }).then(
                    ({userInfo, row: result, hash : tested }) => {
                        if (timingSafeEqual(Buffer.from(tested, "hex"), Buffer.from(result.password, "hex"))) {
                            return userInfo;
                        } else {
                            throw new Error("Forbidden!");
                        }
                    }

                )
        }
    );
}

/**
 * Credentials for a new user.
 */
export type NewCredentials = Omit<Credentials, "id" | "salt">;

/**
 * User information for a new user.
 */
export type NewUserInfo = Omit<UserInfo, "id" | "expired">;

/**
 * Get user information of all users.
 * @param transaction The optional transaction, if the operation is part of a transaction.
 */
export async function getAllUsers(transaction: PoolClient | undefined = undefined): Promise<UserInfo[]> {

    return (transaction ? Promise.resolve(transaction) : createAuthConnection().then(
        async (dbh) => {
            await dbh.query("begin");
            return dbh;
        })).then(
            async (dbh) => {
                const result = await dbh.query<UserInfo>("SELECT id, email, displayName, verified, expires <= NOW() as expired FROM auth_users")
                    .then(
                        async (result) => {
                            if (!transaction) {
                                await dbh.query("commit");
                                dbh.release();
                            }
                            return result;

                        },
                        async (error) => {
                            if (!transaction) {
                                await dbh.query("rollback");
                                dbh.release();
                            }
                            throw error;
                        }
                    );
                return result.rows;
            }
        )
}

/**
 * Create a new user.
 * @param details The user details.
 * @param credentials The user credentials.
 * @param transaction The transaction used to add user. 
 * @returns The promsie of completion.
 */
export async function createUser(details: NewUserInfo, credentials: NewCredentials, transaction: PoolClient | undefined = undefined): Promise<string> {

    return new Promise(async (resolve, reject) => {

        try {
            const dbh = transaction ?? (await createAuthConnection().then(async (dbh) => {
                await dbh.query("begin");
                console.debug("Transaction started");
                return dbh;
            }).catch((err) => { throw err }));
            try {

                var id = crypto.randomUUID();
                console.log("Reserverd UUID For user %s", id);
                const intervalAmount = "'" + Math.max(0, config.userExpiration) + " DAYS'";
                /**
                 * @todo Remove debug output
                 */
                await dbh.query("insert into auth_user (id, email, expires) values ($1, $2, NOW() + make_interval(days=>$3))",
                    [
                        id, details.email, sessionTimeout // details.displayName || null, details.verified ?? false
                    ]).catch( (error) => {
                        // The PG error happened - determining which field has the problem.
                        if (error instanceof DatabaseError) {
                            if (error.code === "23505") {
                                // The unique constraint failed - this means the email address is invalid.
                                throw { message: "Reserved email address.", 
                                    errors: {"email": ["The email address was not acceptable. Please choose new email address."]} 
                                };
                            }
                        }
                    });
                console.log("Created user entry");
                await setPassword(dbh, id, credentials.password.normalize()).then(
                    (result) => {
                        console.log("Password set");
                        return result;
                    },
                    (error) => {
                        console.error("Could not set password");
                        throw error;
                    }
                );
                console.log("Created credentials ");
                // Committing the transaction, if we are doing just one creation.
                if (!transaction) {
                    console.log("Committing transaction...");
                    await dbh.query("commit");
                    dbh.release();
                    console.log("Transaction commited");
                }
                resolve(id);
            } catch (error) {
                /**
                 * @todo Error handling returning standardized error as rejection.
                 */
                if (!transaction) {
                    console.log("Transaction rolled back");
                    await dbh.query("rollback");
                    dbh.release();
                    console.log("Transaction rolled back successfully");
                } else {
                    console.log("Adding user failed");
                }
                throw error;
            }
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Create several users.
 * @param users The users created.
 * @param transaction The transaction the operation is part of.
 */
export async function createUsers(users: [NewUserInfo, NewCredentials][], transaction: PoolClient | undefined = undefined): Promise<void> {
    const dbh = transaction ?? await createAuthConnection().then(async (dbh) => {
        await dbh.query("begin");
        return dbh;
    });
    if (dbh) {
        try {
            for (const [user, credentials] of users) {
                await createUser(user, credentials, dbh);
            }

            // Committing the changes.
            if (!transaction) {
                await dbh.query("commit");
                dbh.release();
            }
        } catch (err) {
            // Rollback on error.
            if (!transaction) {
                await dbh.query("rollback");
                dbh.release();
            }
            throw err;
        }
    } else {
        throw new Error("Connection refused.")
    }
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
 * @param transaction A database handle of the transaction. 
 */
export async function setUserPassword(userId: string, password: string, transaction: PoolClient | undefined = undefined): Promise<void> {
    return (transaction ? Promise.resolve(transaction) : createAuthConnection().then(async dbh => {
        await dbh.query("begin");
        return dbh;
    })).then(async (dbh) => {
        try {
            await setPassword(dbh, userId, password);
            await updateUser({ id: userId }, dbh);
            if (!transaction) {
                await dbh.query("commit");
                dbh.release();
            }
        } catch (err) {
            if (!transaction) {
                await dbh.query("rollback");
                dbh.release();
            }
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
export async function updateUser(details: Partial<Omit<UserInfo, "expired">>, transaction: PoolClient | undefined = undefined): Promise<void> {
    if (details.id == undefined) {
        return Promise.reject(new Error(`User identifier is required for update`));
    } else if (Object.keys(details).length === 1) {
        // Updating expiration only. 
        return (transaction ? Promise.resolve(transaction) :
            createAuthConnection().then(async (dbh) => {
                await dbh.query("begin");
                return dbh;
            })).then(
                async dbh => {
                    await dbh.query("UPDATE auth_user SET expires = NOW + INTERVAL '$1 DAYS' WHERE id=$2", [Math.max(0, config.userExpiration), details.id])
                        .then(
                            async () => {
                                if (!transaction) {
                                    await dbh.query("commit");
                                    dbh.release();
                                }
                            },
                            async (error) => {
                                if (!transaction) {
                                    await dbh.query("rollback");
                                    dbh.release();
                                }
                                throw error;
                            }
                        );
                }
            );
    } else {
        return new Promise(async (resolve, reject) => {
            (transaction ? Promise.resolve(transaction) :
                createAuthConnection().then(async (dbh) => {
                    await dbh.query("begin");
                    return dbh;
                })).then(
                    async dbh => {
                        const [fields, values]: [(keyof typeof details)[], any[]] = (Object.keys(details) as (keyof typeof details)[]).reduce(
                            (result: [(keyof typeof details)[], any[]], key: keyof typeof details, index: number) => {
                                if (key !== 'id' && key in details) {
                                    result[0].push(key);
                                    result[1].push(details[key]);
                                }
                                return result;
                            }, [[], []] as [(keyof typeof details)[], any[]]);
                        const result = dbh.query(`UPDATE auth_user SET expires = NOW() + INTERVAL '$1 days' AND ${fields.map(
                            (field: keyof UserInfo, index: number) => (`${escapeIdentifier(field)}=$${index + 2}`)
                        ).join(" AND ")} WHERE id=$${fields.length + 2}`, [
                            Math.max(0, config.userExpiration), ...values, details.id
                        ]).then(
                            async () => {
                                if (!transaction) {
                                    await dbh.query("commit");
                                    dbh.release();
                                }
                            },
                            async (error) => {
                                if (!transaction) {
                                    await dbh.query("rollback");
                                    dbh.release();
                                }
                                throw error;
                            }
                        )
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
export async function deleteUser(details: UserInfo, transaction: PoolClient | undefined = undefined): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const dbh = transaction ?? await createAuthConnection();
        if (!transaction) {
            await dbh.query("begin");
        }
        try {
            const userInfo = await getUserInfo(details.id, dbh);
            await dbh.query("DELETE FROM auth_user WHERE id=$1", [userInfo.id]);
            if (!transaction) {
                await dbh.query("commit");
                dbh.release();
            }
        } catch (err) {
            if (!transaction) {
                await dbh.query("rollback");
                dbh.release();
            }
            reject(err);
        }
    });
}
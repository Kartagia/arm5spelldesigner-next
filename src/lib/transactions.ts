import { PoolClient, Client } from 'pg';
import pino from 'pino';

/////////////////////////////////////
// Transactions
/////////////////////////////////////
/**
 * Create a new transaction identifier.
 * @returns The transaction identifier.
 */

export function createTransactionId(): string {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
}
/**
 * Transaciton options.
 */

export interface TransactionOptions {
    /**
     * The transaction identifier.
     * @default createTransactionId() A newly created transaction id.
     */
    id?: string;

    /**
     * Are transactions disabled.
     */
    disabled?: boolean;

    /**
     * The logger used to log errors.
     */
    logger?: pino.BaseLogger | Console;

    /**
     * The save point name used for roll backs and commits.
     */
    savePoint?: string;
}
/**
 * Start a new transaction.
 * @param dbh The database conneciton.
 * @param options THe options of the transaction.
 * @returns The transaction identifier of the created transaction, or an undefined value indicating no
 * transaction was created.
 */

export async function startTransaction(dbh: PoolClient | Client, options: TransactionOptions = {}): Promise<string | undefined> {
    const id = options.id ?? createTransactionId();
    return dbh.query("BEGIN").then(
        () => {
            (options.logger ?? console).debug("Transaction %s created.", id);
            return id;
        },
        (error) => {
            (options.logger ?? console).error("Trasaction creation failed. %s", error);
            return undefined;
        }
    );
}
/**
 * Create a new savepoint name for transaction.
 * @param transactionId The tranasction identifier.
 * @param maxLen The maximum lenght of the name. Defaults to the default Postgresql maximum
 * identifier size.
 * @returns The savepoint name for a new savepoint.
 */

export function createNewSavepointName(transactionId: string, maxLen: number = 63) {
    if (transactionId.length >= maxLen) {
        // Using transaciton identifier, as it fills the namespace.
        return transactionId;
    } else {
        // Create new savepoint identfier. 
        const maxBits = maxLen - transactionId.length;
        return `${transactionId}${Math.floor(Math.random() * Math.min(Number.MAX_SAFE_INTEGER, 2 ** (maxBits * 5))).toString(36)}`;
    }
}
/**
 * Start a new transaction savepoint.
 * @param dbh The database conneciton.
 * @param options The options of the transaction.
 * @returns The identifier of the created savepoint, or an undefined value indicating no savepoint was created.
 */

export async function saveTransaction(dbh: PoolClient | Client, options: TransactionOptions = {}): Promise<string | undefined> {
    if (options.id == null) {
        // There is no transaction. 
        return undefined;
    }
    const savePoint = options.savePoint ?? createNewSavepointName(options.id);
    if (savePoint) {
        return dbh.query("SAVEPOINT %s", [savePoint]).then(
            () => {
                (options.logger ?? console).debug("Transaction %s savepoint %s created.", options.id, savePoint);
                return savePoint;
            },
            (error) => {
                (options.logger ?? console).error("Trasaction %s savepoint creation failed. %s", options.id, error);
                return undefined;
            }
        );
    } else {
        return undefined;
    }
}
/**
 * Commit a transaction.
 * @param dbh The database connection.
 * @param options The transaction options.
 * @returns Did the commit happen.
 */

export async function commitTransaction(dbh: PoolClient | Client, options: TransactionOptions = {}): Promise<boolean> {
    const id = options.id ?? "without id";
    return dbh.query("COMMIT").then(
        () => {
            (options.logger ?? console).debug("Transaction %s committed.", id);
            return true;
        },
        (error) => {
            (options.logger ?? console).error("Transaction %s commit failed. %s", id, error);
            return false;
        }
    );
}
/**
 * Release a transcation to the savepoint of the tranasaction.
 * @param dbh The database connection.
 * @param options The transaction options.
 * @returns Did the release happen.
 */

export async function releaseSavepoint(dbh: PoolClient | Client, options: TransactionOptions = {}): Promise<boolean> {
    if (options.savePoint) {
        const id = options.id ?? "without id";
        return dbh.query("RELEASE SAVEPOINT %s", [options.savePoint]).then(
            () => {
                (options.logger ?? console).debug("Transaction %s savepoint %s released.", id, options.savePoint);
                return true;
            },
            (error) => {
                (options.logger ?? console).error("Transaction %s savepoint %s release failed. %s", id, options.savePoint, error);
                return false;
            }
        );
    } else {
        // No savepoint to release.
        return true;
    }
}
/**
 * Roll back a transaction.
 * @param dbh The database connection.
 * @param options The transaction options.
 * @returns Did the roll back happen.
 */

export async function rollbackTransaction(dbh: PoolClient | Client, options: TransactionOptions = {}): Promise<boolean> {
    const id = options.id ?? "without id";
    if (options.savePoint) {
        return dbh.query("ROLLBACK TO SAVEPOINT %s", [options.savePoint]).then(
            () => {
                (options.logger ?? console).debug("Transaction %s rolled back to savepoint %s.", id, options.savePoint);
                return true;
            },
            (error) => {
                (options.logger ?? console).error("Transaction %s roll back to savepoint %s failed. %s", id, options.savePoint, error);
                return false;
            }
        );

    } else {
        return dbh.query("ROLLBACK").then(
            () => {
                (options.logger ?? console).debug("Transaction %s rolled back.", id);
                return true;
            },
            (error) => {
                (options.logger ?? console).error("Transaction %s roll back failed. %s", id, error);
                return false;
            }
        );
    }
}


import 'server-only';
import { Client, DatabaseError, PoolClient } from 'pg';
import { randomBytes, pbkdf2, timingSafeEqual, randomUUID, pbkdf2Sync } from 'node:crypto';
import { Console, ConsoleConstructorOptions } from 'node:console';
import { safeRelease } from './api_db';
import { commitTransaction, releaseSavepoint, rollbackTransaction, startTransaction, TransactionOptions } from './db';

class DebugConsole extends Console {

    logLevels:string[] = ["all", "trace", "debug", "info", "warn", "error", "fatal", "none"];
    
    debugLevel : number = 0;

    module: string = ""; 

    debugLevelName(level: number): string  {

        if (Number.isSafeInteger(level) && level >= 0) {
            return this.logLevels[Math.floor(level/10)] ?? "none";
        } else {
            return "unknown";
        }
    };

    getDebugLevel(name: string): number {
        return this.logLevels.indexOf(name)*10;
    }


    constructor(options: ConsoleConstructorOptions & {level?: number|string, module?: string}) {
        super(options);
        this.debugLevel = (typeof options.level === "string" ? this.getDebugLevel(options.level): options.level ?? 0 );
        this.module = options.module ?? "";

    }

    trace(template: string, ...args: any[]) {
        const level = 10;
        if (this.debugLevel >= level ) {
            super.trace("[%s][%s][%s]"+ template, this.timeStamp, this.debugLevelName(level), ...args);
        }
    }


    debug(template: string, ...args: any[]) {
        const level = 20;
        if (this.debugLevel >= level ) {
            super.debug("[%s][%s][%s]"+ template, this.timeStamp, this.debugLevelName(level), ...args);
        }
    }

    info(template: string, ...args: any[]) {
        const level = 30;
        if (this.debugLevel >= level ) {
            super.info("[%s][%s][%s]"+ template, this.timeStamp, this.debugLevelName(level), ...args);
        }
    }

    warn(template: string, ...args: any[]) {
        const level = 40;
        if (this.debugLevel >= level ) {
            super.warn("[%s][%s][%s]"+ template, this.timeStamp, this.debugLevelName(level), ...args);
        }
    }
    error(template: string, ...args: any[]) {
        const level = 50;
        if (this.debugLevel >= level ) {
            super.error("[%s][%s][%s]"+ template, this.timeStamp, this.debugLevelName(level), ...args);
        }
    }
    fatal(template: string, ...args: any[]) {
        const level = 60;
        if (this.debugLevel >= level ) {
            super.error("[%s][%s][%s]"+ template, this.timeStamp, this.debugLevelName(level), ...args);
        }
    }
    log(template: string, ...args: any[]) {
        return this.info(template, ...args);
    }

};

let logger : DebugConsole = new DebugConsole({stdout: process.stdout, stderr: process.stderr, module: "auth"});

export function setLogLevel(logLevel: number): void{
    logger.debugLevel = logLevel;
}

export function getLogLevel(): number {
    return logger.debugLevel;
}

/**
 * The authentication related configuration.
 */
export interface AuthConfig {


    /**
     * The hashing algorithm iteration count.
     */
    iterations: number;

    /**
     * The hash key lenght in bytes.
     */
    keyLen: number;

    /**
     * The salt length in bytes.
     */
    saltLen: number;

    /**
     * The hashing digest usest. 
     */
    digest: string;
}

const config: AuthConfig = {
    iterations: 100000,
    keyLen: 64,
    saltLen: 20,
    digest: 'sha512'
}


/**
 * The authentication module form field name for email.
 */
export const EmailField = "email";

/**
 * The authetnicaiton module form field name for password.
 */
export const PasswordField = "password";

/**
 * Hash a token.
 * @param value The token value.
 * @returns The token value hashed.
 */
export async function hashToken( value: string ) {

    return pbkdf2Sync(value, "", config.iterations, config.keyLen, config.digest).toString("base64");
}

/**
 * An error indicating that the password has been compromised into the dark web.
 */
export class PasswordCompromisedError extends Error {

    constructor(message: string = "Password hash found in the compromised hashes",
        hash: string | undefined = undefined
    ) {
        super(message, { cause: hash });
        this.name = this.constructor.name;
    }
}

/**
 * Generate a new API key.
 * @returns The new API key.
 */
export function createApiKey(): Promise<string> {
    return Promise.resolve(randomUUID().toString());
}

/**
 * Test hasshed password validity.
 * @param hashed The tested hashed password.
 * @returns Promise of boolean indicating whether the hashed password 
 * is a valid password.
 * @throws {PasswordCompromisedError} The password hash has been compromised.
 */
export function validHashedPassword(hashed: string): Promise<boolean> {

    /**
     * @todo Add Copenhagen protocol tests for the hashed password. 
     */

    // The default test ensures the hashed password is long enough.
    return Promise.resolve(/^\p{Hex_Digit}+$/u.test(hashed) && hashed.length > (128 / 16));
}

/**
 * Check user password.
 * @param hashedSecret The hashed secret.
 * @param password The password given.
 * @param salt The salt spicing the password.
 * @returns Promise whether the user password hashses to the hashed secret.
 */
export async function checkUserPassword(hashedSecret: string, password: string, salt: string): Promise<boolean> {
    return (!timingSafeEqual(Buffer.from(hashedSecret, "hex"),
        Buffer.from(await hashPassword(password, salt), "hex")));
}

/**
 * Generate a new salt.
 * @returns The promise of the generated salt.
 */
export function generateSalt(): Promise<string> {
    var salt: Int8Array = new Int8Array(config.saltLen);
    return Promise.resolve(randomBytes(config.saltLen).toString('hex'));
}

/**
 * Hash a password.
 * @param password The hashed password.
 * @param salt The salt.
 * @returns The hashed passwrod.
 */
export function hashPassword(password: string, salt: string): Promise<string> {

    return new Promise(async (resolve, reject) => {
        pbkdf2(password, salt, config.iterations, config.keyLen, config.digest, (
            err, derivedKey
        ) => {
            if (err) {
                reject(err);
            } else {
                resolve(derivedKey.toString('hex'));
            }
        })
    });
}

/**
 * Test validity of a password.
 * @param value The tested value.
 * @returns True, if and only if the email is a valid password.
 */
export function validPassword(value: string): boolean {
    return value.trim().length >= 14;
}

/**
 * Changes the password of the user and update credentials.
 * If the operation is within transaction, the rollback is performed on error.
 * @param dbh The database client. 
 * @param userId The user identifier.
 * @param password The password. 
 * @param transaction The database transaction into which the operation belongs.
 * - String indicates the name of the savepoint. 
 * - Boolean true indicates the current transaction is operated.
 * Defaults to a new autocommited transaction.
 * - A null value indicates the handle is closed at the end of the operation. 
 * @returns The promise of completion.
 * @throws {DatabaseError} The rejected value contains the database error of the failure.
 */
export async function setPassword(dbh: Client|PoolClient, userId: string, password: string,
    transaction: boolean| string | null = null): Promise<void> {
    if (typeof transaction === "string" && !/^\w+$/.test(transaction)) {
        // Invalid save point 
        throw SyntaxError("Invalid savepoint");
    }

    return new Promise(async (resolve, reject) => {
        const transactionInfo: TransactionOptions = {};
        if (typeof transaction === "string") {
            transactionInfo.savePoint = transaction;
        }
        try {
            if (transaction === false) {
                transactionInfo.id = await startTransaction(dbh, transactionInfo);
            }
            const salt = await generateSalt();
            await dbh.query(
                "insert into user_credentials (id, password, salt) " +
                "VALUES ($1, $2, $3)",
                [userId, await hashPassword(password, salt), salt]
            );
            if (transactionInfo.savePoint) {
                if (await releaseSavepoint(dbh, transactionInfo)) {
                    // Removing the savepoint. 
                    delete(transactionInfo.savePoint);
                }
            } else if (!transaction) {
                if (await commitTransaction(dbh, transactionInfo) && transactionInfo.id) {
                    delete(transactionInfo.id);
                }
            }
            resolve();
        } catch (error) {
            // Error handling.
            logger.error("setPassword: Could not update user credentials", error);
            if (transactionInfo.savePoint) {
                if (await rollbackTransaction(dbh, transactionInfo)) {
                    delete(transactionInfo.savePoint);
                }
            } else if (transaction !== false && transaction !== null) {
                if (await rollbackTransaction(dbh, transactionInfo) && transactionInfo.id) {
                    delete(transactionInfo.id);
                }
            }
            reject(error);
        } finally {
            if (transaction === null) {
                safeRelease(dbh);
            }
        }

    });
}


/**
 * The credentials of the user.
 */
export interface Credentials {
    /**
     * The user id.
     */
    id: string;

    /**
     * The salt of the usr password.
     */
    salt: string;

    /**
     * The hashed salted password.
     */
    password: string;
}

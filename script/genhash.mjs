
import { pbkdf2, randomBytes } from "crypto";

const config = {
    iterations: 100000,
    keyLen: 64,
    saltLen: 20,
    digest: 'sha512'
}
const [ passwd, salt = randomBytes(config.saltLen).toString('hex') ] = process.argv.slice(2,);

if (!/^[a-f\d]+$/i.test(salt)) {
    console.error("Invalid salt:" + salt);
    process.exit(1);
}

pbkdf2(passwd, salt, config.iterations, config.keyLen, config.digest, (err, result) => {
    if (err) {
        console.error(`Hashing failed due error ${err}`);
        process.exit(2);
    } else {
        console.log(`Salt:${salt}`);
        console.log(`Hash:${result.toString('hex')}`);
    }
});

/**
 * Script for creating and verifying hashes the system uses.
 * 
 * @argument 1 The password.
 * @argument [2] The salt. Defaults to a newly generated salt. 
 */

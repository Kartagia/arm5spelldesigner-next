
import { createInterface, Interface } from "node:readline";
import { generateSalt, hashPassword } from "../lib/auth"

const rl = createInterface(process.stdin, process.stdout, undefined, true);

rl.on("close", () => {
    console.log("Quitting...");
    process.exit(0);
})


const salt = await generateSalt();
rl.question("Please enter your password", (answer) => {

    hashPassword(answer, salt).then( (result) => {
        console.log("Hash: %s", result);
    })

    rl.question("Retype the password", (confirm) => {
        if (answer === confirm) {
            console.log("Passwords are equal");
        }
        hashPassword(confirm, salt).then( (result) => {
            console.log("Hash: %s", result);
        })
    
    });
});
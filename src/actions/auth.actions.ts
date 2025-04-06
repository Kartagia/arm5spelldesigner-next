"use server";

import { createSession, EmailField, generateSalt, hashPassword, PasswordCompromisedError, PasswordField, validEmail, validHashedPassword, validPassword } from "@/lib/auth";
import { createAuthConnection } from "@/lib/db";
import { createUser, seekUserInfo, setUserPassword } from "@/lib/users";
import { redirect } from "next/navigation";


/**
 * The actions related to the authentication.
 */
export interface ErrorStruct {
    /**
     * The error message of an invalid email.
     */
    [EmailField]?: string;

    /**
     * The error message of an invalid password.
     */
    [PasswordField]?: string;
}


/**
 * Signup action signing up to the system.
 * @param formData The signup form contents.
 */
export async function signup(previousState: LoginFormState, formData: FormData) {

    const email = formData.get(EmailField)?.toString() ?? "";
    const password = formData.get(PasswordField)?.toString() ?? "";

    var errors: ErrorStruct = {
    };
    if (!validEmail(email)) {
        errors[EmailField] = "Please, enter a valid email address";
    }
    if (!validPassword(password)) {
        errors[PasswordField] = "Please, enter a password with at least 15 characters."
    }
    // Generate the password and salted hash.
    const salt = await generateSalt();
    const hashed = await hashPassword(password, salt);
    validHashedPassword(hashed).then(
        (isValid) => {
            if (!isValid) {
                errors[PasswordField] = "Please, enter a password with at least 15 characters."
            }
        },
        (error) => {
            errors[PasswordField] = "The password has been compromised. Plase, choose another password.";
        }
    )



    if (Object.keys(errors).length > 0) {
        return { ...previousState, errors };
    } else {
        /**
         * @todo Perform signup.
         */
        await createUser({ email }, { password }).then(
            (userId) => {
                console.log(`User ID[${userId}] reserved for email[${email}]`);
                // Create session.
                createSession(userId);
            },
            error => {
                return {
                    ...previousState, errors: {
                        [EmailField]: "Please, choose another email address."
                    }
                };
            }
        )

        // Redirect. 
        redirect("/");
    }
}

/**
 * Login action. 
 * @param formData The login form contents.
 */
export async function login(previousState: LoginFormState, formData: FormData) {
    const email = formData.get(EmailField)?.toString() ?? "";
    const password = formData.get(PasswordField)?.toString() ?? "";

    var errors: ErrorStruct = {
    };

    if (!email) {
        // The email missing.
        errors[EmailField] = "Please, enter an email address.";
    } else if (!validEmail(email)) {
        // The email address was not a valid email addrss.
        errors[EmailField] = "Please, enter a valid email address.";
    } else {

        const userId = await seekUserInfo({ email }).then(
            (userInfo) => {
                return userInfo.id;
            },
            (error) => {
                errors[EmailField] = "Invalid user name or password";
                errors[PasswordField] = "Invalid user name or password";
                return undefined;
            }
        );
        if (userId) {
            await setUserPassword(userId, password).then(
                () => {
                    redirect(origin);
                },
                (error) => {
                    if (error instanceof PasswordCompromisedError) {
                        // This does not prevent login. 
                        errors[PasswordField] = ""
                    }
                    errors[PasswordField] = error;
                }
            )
        }
    }

    if (Object.keys(errors).length > 0) {
        return { ...previousState, errors };
    } else {
        /**
         * @todo Perform creation of a session.
         */

        // Redirect. 
        redirect(previousState?.origin ?? "/");
    }

}
/**
 * The login form state.
 */
export interface LoginFormState {

    /**
     * The origin of the login where the application is redirected on success.
     * @default "/" The application home.
     */
    origin?: string;

    /**
     * The errors on the form.
     */
    errors?: ErrorStruct;
}

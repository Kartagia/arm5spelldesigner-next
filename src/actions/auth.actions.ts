"use server";

import { EmailField, PasswordField, validEmail, validPassword } from "@/lib/auth";
import { redirect } from "next/navigation";


/**
 * The actions related to the authentication.
 */
export interface ErrorStruct {
    /**
     * The error message of an invalid email.
     */
    email?: string;

    /**
     * The error message of an invalid password.
     */
    password?: string;
}


/**
 * Signup action signing up to the system.
 * @param formData The signup form contents.
 */
export async function signup(previousState:  {errors?: ErrorStruct, origin?:string}, formData: FormData) {

    const email = formData.get(EmailField);
    const password = formData.get(PasswordField);

    var errors : ErrorStruct = {
    };
    if (!validEmail(email?.toString() ?? "")) {
        errors[EmailField] = "Please, enter a valid email address";
    }
    if (!validPassword(password?.toString() ?? "")) {
        errors[PasswordField] = "A password must have at least 14 characters."
    }

    if (Object.keys(errors).length > 0) {
        return {...previousState, errors};
    } else {
        /**
         * @todo Perform signup.
         */

        // Redirect. 
        redirect("/");
    }
}

/**
 * Login action. 
 * @param formData The login form contents.
 */
export async function login(previousState: {errors?: ErrorStruct, origin?:string}, formData:FormData) {
    const email = formData.get(EmailField);
    const password = formData.get(PasswordField);

    var errors : ErrorStruct = {
    };

    if (Object.keys(errors).length > 0) {
        return {...previousState, errors};
    } else {
        /**
         * @todo Perform creation of a session.
         */

        // Redirect. 
        redirect(previousState?.origin ?? "/");
    }

}
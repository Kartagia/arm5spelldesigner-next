"use server";

import { EmailField, PasswordField, validEmail, validPassword } from "@/lib/auth";
import { ErrorStruct, SignupFormSchema, SignupFormState } from "@/lib/definitions";
import { createUser } from "@/lib/users";
import { redirect } from "next/navigation";



/**
 * Signup action signing up to the system.
 * @param formData The signup form contents.
 */
export async function signup(previousState:  SignupFormState, formData: FormData) {

    const validatedFields = SignupFormSchema.safeParse({
        email: formData.get(EmailField),
        password: formData.get(PasswordField),
        confirmPassword: formData.get("confirmPassword"),
        displayName: formData.get("displayName")
    });
    if (!validatedFields.success) {
        console.log("Creating account with %d invalid fields", Object.keys(validatedFields.error.flatten().fieldErrors).length);
        return {
            errors: {...validatedFields.error.flatten().fieldErrors} as Record<string, string[]>,
            origin: previousState?.origin?.toString()
        };
    } else {
        console.log("All fields are valid");
    }

    /**
     * @todo perform login.
     * F00barhautakarastaavarakaskasta!
     */
    console.log("Creating account %s", validatedFields.data.email);
    createUser({email: validatedFields.data.email, displayName: validatedFields.data.displayName}, {password: validatedFields.data.password}).then(
        (userId) => {
            console.log("Created user[%s]: %s, %s", userId, validatedFields.data.email, validatedFields.data.displayName);
        }, 
        (error) => {
            console.error("Creating user %s failed due %s.", validatedFields.data.email, error.message);
            return {
                errors: {
                    "general": "Could not create user."
                }
            }
        }
    )
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
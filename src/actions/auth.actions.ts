"use server";

import { createApiKey, EmailField, PasswordField, validEmail, validPassword } from "@/lib/auth";
import { ErrorStruct, SignupFormSchema, SignupFormState, LoginFormState, LoginFormSchema } from "@/lib/definitions";
import { createSession, createSessionCookie, logout as endSession } from "@/lib/session";
import { createUser, loginUser } from "@/lib/users";
import { Cookie } from "lucia";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export async function updateSessionAction(sessionCookie: Cookie) {
    (await cookies()).set(sessionCookie);
}

/**
 * Signup action signing up to the system.
 * @param formData The signup form contents.
 */
export async function signup(previousState: SignupFormState, formData: FormData) {
    const values = {
        email: formData.get(EmailField),
        password: formData.get(PasswordField),
        confirmPassword: formData.get("confirmPassword"),
        displayName: formData.get("displayName")
    };
    const validatedFields = SignupFormSchema.safeParse(values);
    if (!validatedFields.success) {
        console.log("Creating account with %d invalid fields", Object.keys(validatedFields.error.flatten().fieldErrors).length);
        return {
            values: { ...values } as Record<string, string>,
            errors: { ...validatedFields.error.flatten().fieldErrors } as Record<string, string[]>,
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
    createUser({ email: validatedFields.data.email, displayName: validatedFields.data.displayName }, { password: validatedFields.data.password }).then(
        (userId) => {
            console.log("Created user[%s]: %s, %s", userId, validatedFields.data.email, validatedFields.data.displayName);
            // Creating login to the user.
            return loginUser(validatedFields.data.email, validatedFields.data.password).then(
                () => {
                    revalidatePath("/", "layout");
                    redirect(previousState?.origin ?? "/spells");
                }
            )
        },
        (error) => {
            console.error("Creating user %s failed due %s.", validatedFields.data.email, error.message);
            return {
                values,
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
export async function login(previousState: LoginFormState, formData: FormData) {
    const validatedFields = LoginFormSchema.safeParse({
        email: formData.get(EmailField),
        password: formData.get(PasswordField)
    });
    if (validatedFields.success) {
        const user = await loginUser(validatedFields.data.email, validatedFields.data.password);
        console.log("Got user information for user %s: %s", user.id, user.email);
        const session = await createSession(user.id, await createApiKey()).then(
            (result) => {
                console.log("Got session with id %s", result.id);
                return result;
            }, 
            (error) => {
                console.error("Did not get session");
                throw error;
            }
        );
        console.log("Got session")
        const cookie = await createSessionCookie(session.id);
        (await cookies()).set(cookie);
        console.log("Cookies added");
    } else {
        // Failed.
        return {
            values: { email: formData.get(EmailField) },
            errors: validatedFields.error.flatten().fieldErrors
        }
    }

    // Redirect. 
    revalidatePath("/", "layout");
    redirect(previousState?.origin ?? "/spells");

}

export async function logout() {
    console.log("Starting logout");
    const cookieJar = await cookies();
    const sessionId = cookieJar.get("auth_session")?.value;
    console.log("Logging out session %s", sessionId);
    const newCookie = await endSession(sessionId ?? "");
    cookieJar.set(newCookie);
    console.log("Logged out");
    revalidatePath("/", "layout");
    redirect("/login");
}
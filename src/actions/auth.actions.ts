"use server";

import { createApiSession, getApiSession } from "@/lib/api_auth";
import { ErrorContent, UnauthorizedReply } from "@/lib/api_data";
import { createApiKey, EmailField, PasswordField, validPassword } from "@/lib/auth";
import { ErrorStruct, SignupFormSchema, SignupFormState, LoginFormState, LoginFormSchema, ApiSessionInfo } from "@/lib/definitions";
import { stringifyErrors } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createSession, createSessionCookie, logout as endSession } from "@/lib/session";
import { createUser, loginUser } from "@/lib/users";
import { Cookie } from "lucia";
import { revalidatePath } from "next/cache";
import { ResponseCookie, ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { COOKIE_NAME_PRERENDER_BYPASS } from "next/dist/server/api-utils";
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
    return createUser({ email: validatedFields.data.email, displayName: validatedFields.data.displayName }, { password: validatedFields.data.password }).then(
        (userId) => {
            console.log("Created user[%s]: %s, %s", userId, validatedFields.data.email, validatedFields.data.displayName);
            // Creating session for the user.
            return createApiKey().then((apiKey) => (createSession(userId, apiKey))).then(
                (session) => {
                    return createSessionCookie(session.id).then(
                        async (cookie) => {
                            (await cookies()).set(cookie);
                            redirect(previousState?.origin ?? "/spells");
                        },
                        (error) => {
                            // Could not create cookie. Redirecting to login. 
                            logger.error("CreateUser[%s]: CreateSesssion[%s]: Could not create session cookie: %s", userId, session.id, error);
                            redirect("/login");
                        }
                    )
                },
                (error) => {
                    logger.error("CreateUser[%s]: Could not create session: %s", userId, error);
                    redirect("/login");
                }
            )
        },
        (error) => {
            if ("errors" in error) {
                console.log("Creating user %s failed due errors %s", stringifyErrors(error.errors, { prefix: "\n", messageSeparator: "\n- " }));
                return {
                    values: values as Record<string, string>,
                    errors: error.errors
                }
            } else {
                console.error("Creating user %s failed due %s.", validatedFields.data.email, error.message);
                return {
                    values: values as Record<string, string>,
                    errors: {
                        "general": ["Could not create user."]
                    } as Record<string, string[]>
                }
            }
        }
    );
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
        try {
            const user = await loginUser(validatedFields.data.email, validatedFields.data.password);
            console.log("Got user information for user %s: %s", user.id, user.email);
            const {headerKey, sessionCookie} : ApiSessionInfo = await getApiSession(user.id);
            if (!headerKey.value) {
                // The key creation failed. 
                return {
                    values: { email: formData.get(EmailField) } as Record<string, string>,
                    errors: {
                        general: ["Server is busy. Please wait for a few minutes before retrying."]
                    } as Record<string, string[]>
                };
            }

            // Create the Next application session. 
            const session = await createSession(user.id, headerKey.value).then(
                (result) => {
                    console.log("Got session with id %s", result.id);
                    return result;
                },
                (error) => {
                    console.error("Could not create session for user %s", user.id);
                    throw error;
                }
            );
            // Create new session cookie, if the session is no longer fresh.
            const cookie = await createSessionCookie(session.id);
            (await cookies()).set(cookie);
            const cookieNames: string[] = [cookie.name];
            if (sessionCookie && typeof sessionCookie !== "string" && typeof sessionCookie.name === "string") {
                const apiSessionCookie = {
                    ...["httpOnly", "secure", "partitioned"].reduce( (result, prop) => ( 
                    prop in sessionCookie && sessionCookie[prop] ? {...result, [prop]: sessionCookie[prop]} : result), {}),
                    ...["maxAge", "domain", "path", "expires", "sameSite"].reduce( (result, prop) => {
                    if (prop in sessionCookie && typeof prop === "string") {
                        return {...result, [prop]: sessionCookie[prop]};
                    }
                    return result;
                }, {})
                } as Partial<ResponseCookie>;
                (await cookies()).set(sessionCookie.name, (typeof sessionCookie.value === "string" ? sessionCookie.value : undefined) ?? "", apiSessionCookie);
                cookieNames.push(sessionCookie.name);
            }
            console.log("Cookies added - %s", (await cookies().then( (cookieJar) => (cookieNames.filter( name => cookieJar.has(name))))));
        } catch (error) {
            // session creation failed. 
            console.error("Session validation failed due error: %s", error);
            return {
                values: { email: formData.get(EmailField) } as Record<string, string>,
                errors: {
                    general: ["Invalid username or password"]
                } as Record<string, string[]>
            }
        }
    } else {
        // Failed.
        return {
            values: { email: formData.get(EmailField) } as Record<string, string>,
            errors: {
                general: ["Invalid username or password"]
            } as Record<string, string[]>
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
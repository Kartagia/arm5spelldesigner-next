

/**
 * Sigin a new user as API call. 
 */

import { createApiKey } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { createSessionCookie, validateSession } from "@/lib/session";
import { loginUser, UserInfo, getAllUsers } from "@/lib/users";
import { Cookie } from "lucia";
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { cookies } from "next/headers";

/**
 * Does the api key has required priviledges for getting all users. 
 * @param apiKey The tested api key.
 */
function validApiKey(apiKey: string|RequestCookie|null): boolean {
    if (apiKey == null) {
        return false;
    } else {
        const value = typeof apiKey === "string" ? apiKey : apiKey.value;
        return (value.length > 0 && value === process.env.API_KEY);
    }
}

/**
 * Get the user information of the current session.
 * @param request The request.
 * @param sessionId The session identifier of the session
 * @param authToken The user API token, if provided.
 */
async function getCurrentSessionUser(request: Request, sessionId: string, userToken?: string|RequestCookie|null): Promise<Response> {
    // We do have a session - validating it and returning the user information.
    return await validateSession(sessionId).then(
        ({ userInfo, sessionCookie }) => {
            return Response.json([userInfo], {
                status: 200, headers: {
                    "Set-Cookie": sessionCookie.serialize()
                }
            })
        },

        (error) => {
            if (error instanceof Cookie) {
                // The error was not an error, but indication sessions is invalidated.
                return Response.json({ message: "Forbidden" }, {
                    status: 403, headers: {
                        "Set-Cookie": error.serialize()
                    }
                });
            } else {
                throw error;
            }
        });
}

/**
 * Get all user informations, if the user is permmited.
 * @param request The request.
 * @param userToken The user API token.
 * @returns The response to the request.
 */
async function getAllUserInfos(request: Request, userToken: string | RequestCookie | null): Promise<Response> {

    if (userToken) {
        if (validApiKey(userToken)) {
            try {
                // No session - checking the validity of the API key. 
                const apiKey = request.headers.get("apiKey");
                if (apiKey && validApiKey(apiKey)) {
                    // The api key is a valid api key.
                    return await getAllUsers().then(
                        (userInfos) => {
                            return Response.json(userInfos);
                        });
                } else {
                    // Getting account informations rejected.
                    return Response.json({ message: "Unauthorized" }, { status: 401 })
                }
            } catch (error) {
                // Something went wrong.
                console.error(error);
                return Response.json({ message: "Something went wrong" }, { status: 500 });
            }

        } else {
            // The 
            return Response.json({ message: "Getting all users not permitted" }, { status: 403 })
        }
    } else {
        // Without user token, operation is not permitted.
        return Response.json({ message: "API Login required" }, { status: 401 });
    }
}

/**
 * Get all user accounts or user account of the current session.
 * @param request The login request.
 */
export async function GET(request: Request): Promise<Response> {

    const cookieStore = await cookies();
    const sessionId = request.headers.get("sessionId")
    const token = cookieStore.get("api_key") ?? request.headers.get("api_key");

    if (sessionId) {
        return getCurrentSessionUser(request, sessionId, token ?? undefined);
    } else {
        return getAllUserInfos(request, token);
    }

}

/**
 * Perform login.
 * @param request The login request. 
 */
export async function POST(request: Request): Promise<Response> {


    // Perform login.
    if (request.headers.get("Content-Type") === "application/json") {
        // Performign login.
        const params = await request.json();
        if (params.password && params.user) {
            return new Promise<Response>((resolve, reject) => {
                loginUser(params.user, params.password).then(
                    async (userInfo) => {
                        // Create session.
                        await createSession(userInfo.id, await createApiKey()).then(
                            (session) => {
                                return createSessionCookie(session.id).then((cookie) => {
                                    resolve(Response.json(userInfo, {
                                        status: 200, headers: {
                                            "Set-Cookie": cookie.serialize()
                                        }
                                    }));
                                }),
                                    () => {
                                        resolve(Response.json({ message: "Could not create new session" }, { status: 500 }));
                                    }
                            }
                        ).catch((error) => {
                            resolve(Response.json({ message: "Could not create new session" }, { status: 500 }));
                        })
                    },
                    (error) => {
                        if (error === "Forbidden") {
                            resolve(Response.json({ message: "Unauthorized" }, { status: 403 }));
                        } else {
                            resolve(Response.json({ message: "Unauthorized" }, { status: 401 }));
                        }
                    }
                ).catch(
                    (error) => {
                        resolve(Response.json({ message: "Login required" }, { status: 401 }));
                    })
            })
        } else {
            return Response.json({ message: "Missing user credentials" }, { status: 400 })
        }
    } else {
        // Invalid content type.
        return Response.json({ message: "Invalid request" }, { status: 400 })
    }
}


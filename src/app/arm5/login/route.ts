

/**
 * Route handlers for login via API.
 */

import { createApiKey } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { createSessionCookie, validateSession } from "@/lib/session";
import { loginUser, UserInfo } from "@/lib/users";
import { Cookie } from "lucia";
import { cookies } from "next/headers";

/**
 * Test login status.
 * @param request The login request.
 */
export async function GET(request: Request): Promise<Response> {

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;
    const token = cookieStore.get("api_key");

    if (sessionId) {
        return await validateSession(sessionId).then(
            ({ userInfo, sessionCookie }) => {
                return Response.json(userInfo, {
                    status: 200, headers: {
                        "Set-Cookie": sessionCookie.serialize()
                    }
                })
            },

            (cookie) => {
                if (cookie instanceof Cookie) {

                    return Response.json({ message: "Forbidden" }, {
                        status: 403, headers: {
                            "Set-Cookie": cookie.serialize()
                        }
                    });
                } else {
                    throw cookie;
                }
            });
    } else {
        return Response.json({ message: "Login required" }, { status: 401 })
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
            return Response.json({ message: "Missing user credentials"}, {status: 400})
        }
    } else {
        // Invalid content type.
        return Response.json({ message: "Invalid request" }, { status: 400 })
    }
}


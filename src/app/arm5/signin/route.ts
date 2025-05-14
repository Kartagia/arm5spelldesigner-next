import { validateApiRequest, secureConnection, createApiUser } from "@/lib/api_auth";
import { ErrorReply, InvalidResourceContent, InvalidResourceEntry, InvalidResourceReply, UnauthorizedReply } from "@/lib/api_data";
import { SignupFormSchema } from "@/lib/definitions";
import { createUser, NewUserInfo, UserInfo } from "@/lib/users";
import { responseCookiesToRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { z } from "zod";


/**
 * Route to sign in with a user.
 */
export async function POST(request: Request): Promise<Response> {


    // Checking permissions.
    const permissions = await validateApiRequest(request);
    if (permissions.apiKey || secureConnection(request)) {
        // Checking values.
        const user = await request.json();
        // Checkinag the data
        const validatedUser = SignupFormSchema.safeParse(user);
        if (!validatedUser.success) {
            // The sent data is invalid.
            return InvalidResourceReply("user", validatedUser.error.flatten().fieldErrors);
        }

        const newUser: NewUserInfo = { email: validatedUser.data.email, displayName: validatedUser.data.displayName };
        const newCredentials = { password: validatedUser.data.password };
        // Creating the user.
        return await createApiUser(newUser, newCredentials).then(
            (createResponse) => {
                // The identfier attached to the user. 
                return createResponse;
            }, (error) => {
                return ErrorReply(400, "The user name not available");
            });
    } else {
        return UnauthorizedReply(permissions.apiKey ? "Your program user administrator key is not valid." : "Use HTTPS connection.");
    }

}
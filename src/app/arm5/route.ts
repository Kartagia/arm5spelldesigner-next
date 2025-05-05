import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {

    const accept = (await request.headers).get("Accept")?.toString();
    if (accept) {
        const media = ["application/html", "text/plain", "application/json"].find(
            (mediaType) => (accept.includes(mediaType))
        );
        switch (media) {
            case "text/plain":
                return NextResponse.redirect("/arm5api.txt");
            case "application/html":
                return NextResponse.redirect("/public/arm5api.html");
            case "application/json":
                return NextResponse.json([
                    "Welcome to the Ars Magica Open API Repository.\n",
                    "\n",
                    "The repository requires login, or acquiring API key from the repository maintainer.\n"
                ])
            default:

        }
    } 
        
    return NextResponse.json("Welcome to the Ars Magica Open API Respository.\nAuthentication required.\n", {status: 200, statusText: "Wellcome to the Ars Magica Open API Repository"});
}
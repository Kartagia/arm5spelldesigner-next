import { getAllGuidelines, SpellModel } from "@/lib/spells";
import { getAllRDTs } from "@/data/rdts";
import { getAllArts, getAllForms, getAllTechniques } from "@/data/arts";
import { Suspense } from "react";
import { SpellDesignerPanel } from "@/components/SpellDesignerPanel";
import { getAllSpells, storeSpells } from "@/data/spells";
import { UUID } from "crypto";
import { validateSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";



/**
 * Wrapper for spell designer to load the data the component needs.
 * @returns 
 */
async function SpellDesignerWrapper() {
    const forms = await getAllForms();
    const techniques = await getAllTechniques();
    const guidelines = await getAllGuidelines();
    const allRDTs = await getAllRDTs();
    const spells = await getAllSpells();

    const sessionId = await (await cookies()).get("auth_session")?.value;
    if (sessionId) {
        const {userInfo, sessionCookie} = await validateSession(sessionId);
        if (!userInfo) {
            console.log("Redirecting user to login")
            redirect("/login");
            return;
        }
    } else {
        console.log("Redirecting user to login")
        redirect("/login");
    }

    return (<SpellDesignerPanel spells={spells} rdts={allRDTs} forms={forms} techniques={techniques} guidelines={guidelines} />)

}



/**
 * Spell editor page.
 */
export default async function SpellsPage() {

    // Testing login.

    // Returning the page.
    return (
        <section className="primary min-h-100">
            <header className="title primary">Spells</header>
            <main className="main column scroll">
                <Suspense fallback="Loading...">
                    <SpellDesignerWrapper />
                </Suspense>
            </main>
            <footer className="footer">Spell designer blurb goes here.</footer>
        </section>
    )
}

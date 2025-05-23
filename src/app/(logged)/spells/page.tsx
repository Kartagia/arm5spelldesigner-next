"use server";
import { getAllGuidelines, NewSpellModel, SpellModel } from "@/lib/spells";
import { getAllRDTs } from "@/data/rdts";
import { getAllForms, getAllTechniques } from "@/data/arts";
import { Suspense } from "react";
import { SpellDesignerPanel } from "@/components/SpellDesignerPanel";
import { getAllSpells, storeSpells } from "@/data/spells";
import { validateSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { saveSpells } from "@/actions/spells.actions";


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
    return (<SpellDesignerPanel spells={spells} rdts={allRDTs} forms={forms} techniques={techniques} saveChangesAction={saveSpells} guidelines={guidelines} />)

}



/**
 * Spell editor page.
 */
export default async function SpellsPage() {

    // Testing login.
    const {userInfo} = await validateSession( (await cookies()).get("auth_session")?.value ?? "");


    // Returning the page.
    return (<div className="primary min-h-100">
            <header className="title primary">Spells</header>
            <main className="main column">
                <Suspense fallback="Loading...">
                    <SpellDesignerWrapper />
                </Suspense>
            </main>
            <footer className="footer">&nbsp;</footer>
        </div>)
};

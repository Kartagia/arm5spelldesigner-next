import { getAllGuidelines, getAllSpells } from "@/lib/spells";
import { getAllRDTs } from "@/data/rdts";
import { getAllArts, getAllForms, getAllTechniques } from "@/data/arts";
import { Suspense } from "react";
import { SpellDesignerPanel } from "@/components/SpellDesignerPanel";


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

    return (<SpellDesignerPanel spells={spells} rdts={allRDTs} forms={forms} techniques={techniques} guidelines={guidelines}/>)
}



/**
 * Spell editor page.
 */
export default function SpellsPage() {


    return (
        <section className="primary">
            <header className="title primary">Spells</header>
            <main className="main">
                <Suspense fallback="Loading...">
                    <SpellDesignerWrapper />
                </Suspense>
            </main>
            <footer className="footer">Spell designer blurb goes here.</footer>
        </section>
    )
}

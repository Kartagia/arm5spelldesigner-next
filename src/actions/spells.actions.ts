"use server";

import { storeSpells, createSpell as createApiSpell } from "@/data/spells";
import { NewSpellModel, SpellModel } from "@/lib/spells";
import { UUID } from "crypto";
import { revalidatePath } from "next/cache";

export async function saveSpells( spells: SpellModel[], altered?: UUID[]) {
    console.log("Altered UUIDS: %s", altered ? "[" + altered.join(", ") + "]" : "Not given");
    await storeSpells(spells, altered);

    revalidatePath("/", "layout");
}


export async function createSpell( spell: NewSpellModel ) {
    console.log("Storing new spell");
    return await createApiSpell(spell).then(
        (result) => {
            console.log("Spell stored with uuid: %s", result);
            return result;
        }, 
        (error) => {
            console.error("Storing spell failed with error: %s", error);
            throw error;
        }
    );
}
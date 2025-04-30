"use server";

import { storeSpells } from "@/data/spells";
import { SpellModel } from "@/lib/spells";
import { UUID } from "crypto";

export async function saveSpells( spells: SpellModel[], altered?: UUID[]) {
    console.log("Altered UUIDS: %s", altered ? "[" + altered.join(", ") + "]" : "Not given");
    storeSpells(spells, altered);
}

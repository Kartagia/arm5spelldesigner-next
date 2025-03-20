'use server'

import { revalidatePath } from "next/cache";
import { setCurrentArtIndex } from "@/data/context";

export async function setCurrentArt(context: string|null=null, selectedIndex: number|undefined|null = null, formData : FormData) {

    // Get the parameter of the form data.
    const rawFormData = {
        selected: selectedIndex === null ? formData.get('selected')?.valueOf() : selectedIndex,
        context: context === null ? formData.get('context')?.toString() || "" : context
    };

    setCurrentArtIndex(rawFormData.context, rawFormData.selected == null || rawFormData.selected === "" ? undefined : Number(rawFormData.selected));
    revalidatePath("/", "layout");
}

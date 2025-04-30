import { ArtModel } from "@/lib/spells";
import { ChangeEventHandler } from "react";




export function SelectArts({ forms = [], techniques = [], readonly = false, technique = undefined, form = undefined, controlled = false, onSelect = undefined
}: {
    forms: ArtModel[]; techniques: ArtModel[]; readonly?: boolean; technique?: string; form?: string; controlled?: boolean;
} &
    { onSelect?: (selectedArt: ArtModel) => void; }) {


    const handleSelectForm: ChangeEventHandler<HTMLSelectElement> = (e) => {
        console.group("Handling select form");
        const selected = forms.find(art => (art.abbrev == e.target.value));
        if (selected && onSelect) {
            onSelect(selected);
            console.log("Reported selected form %s(%s)", selected.art, selected.abbrev);
        } else if (selected) {
            console.log("Selected form %s(%s)", selected.art, selected.abbrev);
        } else {
            console.log("No form found")
        }
        console.groupEnd();
    };
    const handleSelectTechnique: ChangeEventHandler<HTMLSelectElement> = (e) => {
        console.group("Handling select technique");
        const selected = techniques.find(art => (art.abbrev == e.target.value));
        if (selected && onSelect) {
            onSelect(selected);
            console.log("Reported selected form %s(%s)", selected.art, selected.abbrev);
        } else if (selected) {
            console.log("Selected form %s(%s)", selected.art, selected.abbrev);
        } else {
            console.log("No form found")
        }
    };

    return (
        <div className="flex row">
            <div className="flex-item">
            <label className={"flex-item"}>Form</label>
            <select className="flex-item border" disabled={readonly} name="technique" onChange={handleSelectTechnique} value={controlled ? technique : undefined} defaultValue={controlled ? undefined : technique}>
                {techniques.map((technique) => (<option key={technique.abbrev} value={technique.abbrev}>{technique.art}</option>))}
            </select>
            </div>
            <div className="flex-item">
            <label className={"flex-item"}>Technique</label>
            <select className="flex-item border" disabled={readonly} name="form" onChange={handleSelectForm} value={controlled ? form : undefined} defaultValue={controlled ? undefined : form}>
                {forms.map((form) => (<option key={form.abbrev} value={form.abbrev}>{form.art}</option>))}
            </select>
            </div>
        </div>
    );
}


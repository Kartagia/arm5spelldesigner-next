import { useState, ChangeEventHandler, useEffect } from "react";
import { getGuidelineValue, GuidelineModel } from "@/lib/spells";
import { ArtModel } from "@/lib/spells";
import { UUID } from "crypto";


export interface GuidelineProperties {

    /**
     * The forms available beyond the guideline forms. 
     */
    forms?: ArtModel[];

    /**
     * The techniques available beyond guideine technqiues.
     */
    techniques?: ArtModel[];

    /**
     * The guidelines to choose from.
     */
    guidelines: GuidelineModel[];

    /**
     * The currently selected guideline. This must be a guideline, or
     * a GUID among the guideliens in the model. 
     */
    value?: GuidelineModel|UUID;
}

/**
 * Events related to the guideline editor.
 */
export interface GuidelineEvents {

    /**
     * The guideline was changed. 
     */
    onGuidelineChange?: (value: GuidelineModel) => void;
}

export function SelectGuideline({ forms = [], techniques = [], guidelines = [], value = undefined, ...rest }: {
    forms?: ArtModel[]; techniques?: ArtModel[]; guidelines: GuidelineModel[]; value?: GuidelineModel | string;
} & GuidelineEvents) {
    "use client";
    const [currentValue, setValue] = useState<GuidelineModel | undefined>(value ? getGuidelineValue(guidelines, value) : undefined);
    const setCurrent = (value: string | GuidelineModel) => {
        setValue(getGuidelineValue(guidelines, value));
    };
    const [selectedForms, selectForms] = useState<string[]>([]);
    const [selectedTechniques, selectTechniques] = useState<string[]>([]);

    const filter = (guideline: GuidelineModel) => {
            return (selectedForms.length === 0 || guideline.form in selectedForms) &&
                (selectedTechniques.length === 0 || guideline.technique in selectedTechniques);
        };
    const handleSelectForm: ChangeEventHandler<HTMLSelectElement> = (e) => {
        selectForms(current => {
            if (e.target.value in current) {
                return [...current, e.target.value];
            } else {
                return current.filter(form => (form !== e.target.value));
            }
        });
    };
    const handleSelectTechnique: ChangeEventHandler<HTMLSelectElement> = (e) => {
        selectTechniques(current => {
            if (e.target.value in current) {
                return [...current, e.target.value];
            } else {
                return current.filter(form => (form !== e.target.value));
            }
        });
    };

    const handleSelectGuideline: ChangeEventHandler<HTMLSelectElement> = (e) => {

        if (e.target.value.startsWith("key:")) {
            // Unregistered guideline.
            const newValue = guidelines.find((cursor) => (`key:${cursor.form}${cursor.technique}${cursor.level}${cursor.name}` === e.target.value));
            if (newValue) {
                setCurrent(newValue);
                if (rest.onGuidelineChange) {
                    rest.onGuidelineChange(newValue);
                }
            }
        } else {
            // Registered guideline with GUID.
            setCurrent(e.target.value);
            if (rest.onGuidelineChange) {
                const newValue = guidelines.find( (cursor) => (cursor.guid === e.target.value));
                if (newValue) {
                    rest.onGuidelineChange(newValue);
                }
            }
        }
    };

    return (
        <div>
            <select disabled={value !== undefined} name="form" defaultValue={currentValue ? forms.find(art => (art.abbrev === currentValue.form))?.abbrev : undefined} onChange={handleSelectForm}>
                {forms.map((art) => (<option key={art.abbrev} value={art.abbrev}>{art.art}</option>))}
            </select>
            <select disabled={value !== undefined} name="technique" defaultValue={currentValue ? techniques.find(art => (art.abbrev === currentValue.technique))?.abbrev : undefined} onChange={handleSelectTechnique}>
                {techniques.map((art) => (<option key={art.abbrev} value={art.abbrev}>{art.art}</option>))}
            </select>
            <select name="guideline" onChange={handleSelectGuideline}>
                {guidelines.filter(filter).map(guideline => (<option key={`key:${guideline.form}${guideline.technique}${guideline.level}${guideline.name}`}
                    value={guideline.guid ?? `key:${guideline.form}${guideline.technique}${guideline.level}${guideline.name}`}
                >{guideline.name}</option>))}
            </select>
        </div>
    );
}

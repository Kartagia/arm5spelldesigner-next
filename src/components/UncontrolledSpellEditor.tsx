"use client";

import { MouseEventHandler, RefObject, useEffect, useRef, useState } from "react";
import { SpellEditorProperties, SpellEditorEvents } from './SpellEditor';
import { ArtModel, GuidelineModel, NewSpellModel, SpellModel } from '@/lib/spells';
import { SelectGuideline } from "./SelectGuideline";
import { SelectArts } from "./SelectArts";
import { validUUID } from "@/lib/modifiers";
import styles from "./UncotrolledSpellEditor.module.css";

/**
 * Log a message along with a function.
 * @param value The value.
 * @param message The message logged.
 * @param optionalValues The optional value.s
 * @returns The original value.
 */
function logFn<TYPE>(value: TYPE, message?: string, ...optionalValues: any[]): TYPE {
    console.log(message, ...optionalValues);
    return value;
}

function createNewSpell(): Partial<SpellModel> {
    const result: Partial<SpellModel> = {
        name: "",
        level: 0,
        guideline: undefined,
        description: undefined
    };
    return result;
}

function getArtValue( value: ArtModel|string): string {
    if (typeof value === "string") {
        return value;
    } else {
        return value.abbrev;
    }
}

export interface SelectLevelEvents {
    /**
     * Report selection of a level.
     * @param newValue The new level value.
     */
    onSelect?: (newValue: "Generic"|number) => void;

}

export interface SelectLevelProperties {

    /**
     * The name of the component on form.
     */
    name?: string;

    /**
     * The default level of the spell.
     */
    defaultValue?: "Generic"|number;

    /**
     * The controlled component value.
     */
    value?: "Generic"|number;
}

export type SelectLevelProps = SelectLevelEvents & SelectLevelProperties;

/**
 * A level selection component.
 * @param props The properties of the compoentn.
 * @returns The creaeted component.
 */
export function SelectLevel(props: SelectLevelProps) {
    const value = props.defaultValue ?? props.value;
    const levelChoices = [];
    for (let i=1; i < 100; (i < 5 ? i++ : i += 5)) {
        levelChoices.push(i);
    }
    const prefix = value === "Generic" ? "G" : "";

    return (<select name={props.name} value={value} onChange={
        (e) => {
            if (props.onSelect) {
                props.onSelect(Number(e.target.value));
            }
        }
    }>{levelChoices.map( level => (<option key={level} value={level}>{prefix}{level}</option>))}</select>)
}

/**
 * An uncontrolled spell editor contains its own state.
 */
export default function UncontrolledSpellEditor( props: Omit<SpellEditorProperties, "value"> & SpellEditorEvents) {
    const [defaultSpell, setDefaultSpell] = useState(props.defaultValue);
    const [spell, setSpell] = useState(props.defaultValue ?? createNewSpell());
    const [level, setLevel] = useState(spell.level);
    const [form, setForm] = useState(spell.form);
    const [technique, setTechnique] = useState(spell.technique);
    const [description, setDescription] = useState(spell.description);
    const [newSpellName, setNewSpellName] = useState("");
    useEffect(() => {
        console.log("Check if important properties has changed");
        if (props.defaultValue !== defaultSpell) {
            console.log("Default spell has changed");
            setDefaultSpell(props.defaultValue);
            const newSpell = props.defaultValue ?? createNewSpell();
            setSpell(newSpell);
            setTechnique(newSpell.technique);
            setForm(newSpell.form);
            setLevel(newSpell.level);
            setDescription(newSpell.description);
            setNewSpellName("");
            console.log("Descrioption %s and %s", newSpell.description ?? "[NO DESCRIPTION]", description ?? "[NO DESCRIPTION]")
        }
    }, [props])


    const handleFormChange = (newValue: ArtModel|string) => {
        if (!Object.is(form, newValue)) {
            setSpell( currentSpell => ({...currentSpell, form: getArtValue(newValue)}));
            setForm(getArtValue(newValue));
            if (props.onFormChange) {
                props.onFormChange(newValue);
            }
        }
    };

    const handleTechniqueChange = (newValue: ArtModel|string) => {
        if (!Object.is(technique, newValue)) {
            setSpell( currentSpell => ({...currentSpell, technique: getArtValue(newValue)}));
            setTechnique(getArtValue(newValue));
            if (props.onTechniqueChange) {
                props.onTechniqueChange(newValue);
            }
        }
    };


    const handleGuidelineChange = (newGuideline: GuidelineModel) => {
        const {technique = undefined, form = undefined} = spell;
        setSpell( currentSpell => ({...currentSpell, guideline: newGuideline.guid}));
        if (props.onGuidelineChange) {
            props.onGuidelineChange(newGuideline);
        }
        setTechnique(newGuideline.technique);
        setForm(newGuideline.form);
    };

    /**
     * Is candidate incomplete.
     * @param spell The spell candidate. 
     * @returns True, if and only if the spell is not valid spell for creation.
     */
    function incompleteSpell(spell: SpellModel|Partial<SpellModel>|undefined): boolean {
        return createSpell(spell) === undefined;
    }

    /**
     * Create a new spell.
     * @param spell The spell candidate.
     * @returns The created spell, if the candidate is a valid spell.
     */
    function createSpell(spell: SpellModel|Partial<SpellModel>|undefined): SpellModel|NewSpellModel|undefined {
        if (spell && spell.name && spell.technique && spell.form && (spell.guideline === undefined || validUUID(spell.guideline)) &&
            spell.level && (spell.level === "Generic" || spell.level > 0)
    ) {
            return {
                name: spell.name, 
                guid: spell.guid,
                guideline: spell.guideline,
                technique: spell.technique,
                form: spell.form, 
                level: spell.level,
                traits: spell.traits,
                description: spell.description
            };
        } else {
            return undefined;
        }
    }


    const handleCommitChanges: MouseEventHandler = (e) => {
        let newSpell: SpellModel|NewSpellModel|undefined = undefined;
        if (newSpellName) {
            // New spell with proper name.
            newSpell = createSpell({...spell, name: newSpellName});
        } else {
            newSpell = createSpell(spell);
        }
        if (newSpell && props.onConfirm) {
            console.log("Reporting new spell: %s(%s%s%s)", newSpell.name, newSpell.technique, newSpell.form, newSpell.level);
            props.onConfirm(newSpell);
        } else if (newSpell) {
            console.log("Nobody is concerned on spell: %s(%s%s%s)", newSpell.name, newSpell.technique, newSpell.form, newSpell.level);
        } else {
            console.log("No spell to commit!");
        }
        console.log("Reseting the dialog")
        setSpell(createNewSpell());
        setNewSpellName("");
    };

    const handleDescriptionChange = ( newDesc: string|undefined) => {
        if (spell) {
            setSpell({...spell, description: newDesc});
            setDescription(newDesc);
        }
    }


    return (<section className="flex column scroll">
        <header className="header">{spell.name ? spell.name : <input name="name" placeholder="New Spell" onChange={
            e => { setNewSpellName(e.target.value)}
        }></input>}</header>
        <main className="main column scroll">
            <div>
        {props.defaultValue === undefined && (props.guidelines ?? []).length > 0 ? 
        <><header>Guideline</header><SelectGuideline guidelines={props.guidelines ?? []} onGuidelineChange={ handleGuidelineChange } /></>
        : <><h1 className="subtitle">Arts</h1>
        <div>
        <SelectArts controlled={true}
            onSelect={ (e) => { e.type === "Form" ? handleFormChange(e) : handleTechniqueChange(e)}}
        forms={props.forms ?? []} form={form} techniques={props.techniques ?? []} technique={technique} /></div></> 
        }
        </div>
        <div className="form-field">
            <label>Level</label>
        <SelectLevel onSelect={ (newLevel) => {setSpell({...spell, level: newLevel}); setLevel(newLevel)} } value={level} />
        </div>
            <div className="form-field flex column">
                <label className="HFill">Description</label>

            <div className={styles.HFill} >
            
        <textarea name={"description HFill"} cols={80} rows={6} className="basic" onChange={ (e) => {
            console.log("Changing desc \"%s\" to \"%s\"", description, e.target.value);
            handleDescriptionChange( e.target.value.length === 0 ? undefined : e.target.value);
        }} value={description ?? ""} placeholder={"Enter spell descripton here"}>
        </textarea>
        </div>
        </div>
        </main>
        <footer className="footer">
            <button className="flex-item" disabled={incompleteSpell(spell.name ? spell : {...spell, name: newSpellName})} name="commit" onClick={handleCommitChanges}>{props.defaultValue ? "Confirm changes" : "Create spell"}</button>
            <button className="flex-item" name="default" onClick={() => {
                setSpell(defaultSpell ?? createNewSpell());
                setLevel(defaultSpell?.level);
                setTechnique(defaultSpell?.technique);
                setForm(defaultSpell?.form);
                setDescription(defaultSpell?.description);
            }}>{"Cancel changes"}</button>
            {props.defaultValue ? <button className="flex-item" name="close" onClick={() => {
                if (props.onCancel) {
                    props.onCancel();
                }
                const newSpell = createNewSpell();
                setSpell(newSpell);
                setLevel(newSpell.level);
                setTechnique(newSpell.technique);
                setForm(newSpell.form);
                setDescription(newSpell.description ?? "");
                setNewSpellName("");
            }} >Close</button> : null}
        </footer>
    </section>)
}
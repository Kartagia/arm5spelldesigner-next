"use client";

import { MouseEventHandler, RefObject, useEffect, useRef, useState } from "react";
import { SpellEditorProperties, SpellEditorEvents } from './SpellEditor';
import { ArtModel, createRDTSet, deriveRDTSet, GuidelineModel, NewSpellModel, SpellModel } from '@/lib/spells';
import { SelectGuideline } from "./SelectGuideline";
import { SelectArts } from "./SelectArts";
import { changeRDT, checkUUID, RDT, rdtsToString, validUUID } from "@/lib/modifiers";
import styles from "./UncotrolledSpellEditor.module.css";
import { storeDbSpells } from "@/data/spells";
import { createSpell as createApiSpell } from "@/actions/spells.actions"
import { RDTPanel } from "./RDTPanel";
import { logger } from "@/lib/logger";
import { nativeEnum } from "zod";
import { getAllRDTs } from "@/data/rdts";

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

function createNewSpell(forms: ArtModel[] = [], techniques: ArtModel[] = [], rdts: RDT<string>[]): Partial<SpellModel> {
    const result: Partial<SpellModel> = {
        name: "",
        level: 1,
        guideline: undefined,
        form: techniques[0]?.abbrev,
        technique: forms[0]?.abbrev,
        description: undefined,
        range: rdts.filter( rdt => (rdt.type === "Range")).slice(0,1) as RDT<"Range">[],
        duration: rdts.filter( rdt => (rdt.type === "Duration")).slice(0,1) as RDT<"Duration">[],
        target: rdts.filter( rdt => (rdt.type === "Target")).slice(0,1) as RDT<"Target">[]
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
    const [spell, setSpell] = useState(props.defaultValue ?? createNewSpell(props.forms, props.techniques, props.allRDTs));
    const [level, setLevel] = useState(spell.level);
    const [form, setForm] = useState(spell.form);
    const [technique, setTechnique] = useState(spell.technique);
    const [description, setDescription] = useState(spell.description);
    const [newSpellName, setNewSpellName] = useState("");
    const ranges = props.allRDTs.filter( rdt => (rdt.type === "Range")) as RDT<"Range">[];
    const durations = props.allRDTs.filter( rdt => (rdt.type === "Duration")) as RDT<"Duration">[];
    const targets = props.allRDTs.filter( (rdt => (rdt.type === "Target"))) as RDT<"Target">[];
    const [rdt, setRDT] = useState(createRDTSet(spell.range ??  [], spell.duration ?? [], spell.target ?? []));
    useEffect(() => {
        logger.info("Check if important properties has changed");
        if (props.defaultValue !== defaultSpell) {
            logger.info("Default spell has changed");
            setDefaultSpell(props.defaultValue);
            const newSpell = props.defaultValue ?? createNewSpell(props.forms, props.techniques, props.allRDTs);
            setSpell(newSpell);
            setTechnique(newSpell.technique);
            setForm(newSpell.form);
            setLevel(newSpell.level);
            setDescription(newSpell.description);
            setNewSpellName("");
            logger.debug("RDTS from %s to %s", 
                [rdtsToString(rdt.range, "R:"), rdtsToString(rdt.duration, "D:"), rdtsToString(rdt.target, "T:")].join(", "),
                [rdtsToString(newSpell.range ?? ranges.slice(0,1), "R:"), 
                            rdtsToString(newSpell.duration ??durations.slice(0,1), "D:"), 
                            rdtsToString(newSpell.target ?? targets.slice(0,1) , "T:")].join(","))
            setRDT(createRDTSet(newSpell.range ?? ranges.slice(0,1), newSpell.duration ?? durations.slice(0,1), newSpell.target ?? targets.slice(0,1)))
            logger.debug("Descrioption %s and %s", newSpell.description ?? "[NO DESCRIPTION]", description ?? "[NO DESCRIPTION]")
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
            spell.level && (spell.level === "Generic" || spell.level > 0) &&
            [spell.range, spell.duration, spell.target].every( rdt => (rdt && rdt.length > 0))
    ) {
            return {
                name: spell.name, 
                guid: spell.guid,
                guideline: spell.guideline,
                technique: spell.technique,
                form: spell.form, 
                level: spell.level,
                traits: spell.traits,
                description: spell.description, 
                range: spell.range, 
                duration: spell.duration,
                target: spell.target
            };
        } else {
            return undefined;
        }
    }


    const handleCommitChanges: MouseEventHandler = (e) => {
        let newSpell: SpellModel|NewSpellModel|undefined = undefined;
        if (newSpellName) {
            // New spell with proper name.
            newSpell = createSpell({...spell, name: newSpellName, range: rdt.range, duration: rdt.duration, target: rdt.target});
        } else {
            newSpell = createSpell({...spell, range: rdt.range, duration: rdt.duration, target: rdt.target});
        }
        if (newSpell && props.onConfirm) {
            console.log("Reporting new spell: %s(%s%s%s, %s)", newSpell.name, newSpell.technique, newSpell.form, newSpell.level, 
                rdtsToString(newSpell.range ?? [], "R"), rdtsToString(newSpell.duration ?? [], "D"), rdtsToString(newSpell.target ?? [], "T") );
            props.onConfirm(newSpell);
        } else if (newSpell) {
            console.log("Nobody is concerned on spell: %s(%s%s%s, %s)", newSpell.name, newSpell.technique, newSpell.form, newSpell.level, 
                rdtsToString(newSpell.range ?? [], "R"), rdtsToString(newSpell.duration ?? [], "D"), rdtsToString(newSpell.target ?? [], "T") );
        } else {
            console.log("No spell to commit!");
        }
        console.log("Reseting the dialog")
        setSpell(createNewSpell(props.forms, props.techniques, props.allRDTs));
        setNewSpellName("");
    };

    const handleDescriptionChange = ( newDesc: string|undefined) => {
        if (spell) {
            setSpell({...spell, description: newDesc});
            setDescription(newDesc);
        }
    }

    function handleRDTChange<TYPE extends string>(name: string, type: TYPE, newValue: RDT<TYPE>[]) {
        logger.debug("Handling RDT change %s of %s to %s", name, type, rdtsToString(newValue, type) );
    
        switch (type) {
            case "Range":
                setSpell( (current) => {
                    return {...current, range: newValue as RDT<"Range">[]};
                } );
                setRDT( (current) => deriveRDTSet(current, "Range", newValue as RDT<"Range">[]) );
                
                break;
            case "Duration":
                setSpell( (current) => {
                    current.duration = newValue as RDT<"Duration">[];
                    return {...current, duration: newValue as RDT<"Duration">[]};
                } );
                setRDT( (current) => deriveRDTSet(current, "Duration", newValue as RDT<"Duration">[]) );
                break;
            case "Target":
                setSpell( (current) => {
                    current.target = newValue as RDT<"Target">[];
                    return {...current, target: newValue as RDT<"Target">[]};
                } );
                setRDT( (current) => deriveRDTSet(current, "Target", newValue as RDT<"Target">[]) );
                break;

            default:
                console.log("Unknown RDT variable %s", name);
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
        <div className="form-field">
            <label>Level</label>
        <SelectLevel onSelect={ (newLevel) => {setSpell({...spell, level: newLevel}); setLevel(newLevel)} } value={level} />
        </div>
        </div>
        <RDTPanel className={"flex-item justify-between"} rdts={props.allRDTs} onChange={handleRDTChange}
        value={rdt}></RDTPanel>

            <div className="form-field flex column">
                <label className="HFill flex-item">Description</label>

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
                setSpell(defaultSpell ?? createNewSpell(props.forms, props.techniques, props.allRDTs));
                setLevel(defaultSpell?.level);
                setTechnique(defaultSpell?.technique);
                setForm(defaultSpell?.form);
                setDescription(defaultSpell?.description);
            }}>{"Cancel changes"}</button>
            {props.defaultValue ? <button className="flex-item" name="close" onClick={() => {
                if (props.onCancel) {
                    props.onCancel();
                }
                const newSpell = createNewSpell(props.forms, props.techniques, props.allRDTs);
                setSpell(newSpell);
                setLevel(newSpell.level);
                setTechnique(newSpell.technique);
                setForm(newSpell.form);
                setDescription(newSpell.description ?? "");
                setNewSpellName("");
            }} >Close</button> : null}
            {!props.defaultValue && false && <button disabled={newSpellName.length === 0} className="flex-item" name="apiStore" onClick={
                async (e) => {
                    e.preventDefault();
                    const name = newSpellName.trim();
                    if (name && spell.level && spell.technique && spell.form) {
                        const newSpell : NewSpellModel = {...spell, technique: spell.technique, form: spell.form, level: spell.level ?? 1, name};
                        await createApiSpell(newSpell).then(
                            (result) => {
                                alert("Created spell with GUID: " + result);
                                if(name && spell.level !== undefined  && props.onConfirm) {
                                    props.onConfirm({...newSpell, guid: checkUUID(result)});
                                }
                            },
                            (error) => {
                                alert("Creating spell failed: " + error);
                            }
                        );
                        // Clearing the spell ui.
                    } else {
                        alert("You must given spell proper: " +  
                            ([
                                ...(name.trim() ? ["name"] : [] as string[]),
                                ...(!spell.level ? ["level"]: [] as string[]),
                                ...(!spell.technique ? ["technique"]: [] as string[]),
                                ...(!spell.form ? ["form"]: [] as string[]),
                            ]).join(", ")
                        );
                    }
                } 
            }>Uncached save</button>
            }
        </footer>
    </section>)
}
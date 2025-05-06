"use client";
import styles from './SpellDesignerPanel.module.css';

import { checkUUID, RDT, validUUID } from "@/lib/modifiers";
import { ArtModel, getSpellKey, GuidelineModel, NewSpellModel, SpellModel } from "@/lib/spells";
import { UUID } from "crypto";
import { MouseEventHandler, useState } from "react";
import SpellEditorComponent from "./SpellEditor";


/**
 * THe events related to the spell designer panel.
 */
export interface SpellDesignerEvents {

    /**
     * The new save change handler.
     * @param spells The updated spells list.
     */
    onSaveChanges?: ((spells: (SpellModel|NewSpellModel)[], alteredGuids?: UUID[]) => void);

    /**
     * Action handling saving of the component.
     * @param spells Teh spells saved.
     * @param alteredGuids The form element
     * @returns 
     */
    saveChangesAction?: (spells: (SpellModel|NewSpellModel)[], alteredGuids?: UUID[]) => Promise<void>
}

/**
 * The spell designer panel properties.
 */
export interface SpellDeignerProperties {


    /**
     * The RDTs available.
     */
    rdts: RDT<"Range"|"Duration"|"Target"|string>[];

    /**
     * THe spells available. 
     */
    spells: SpellModel[];

    /**
     * The forms available.
     */
    forms: ArtModel[];

    /**
     * The arts available. 
     */
    techniques: ArtModel[];

    /**
     * The guidelines avialable. 
     */
    guidelines: GuidelineModel[];
}

export type SpellDesignerPanelProps = SpellDeignerProperties & SpellDesignerEvents;

/**
 * The spell title component.
 * @param param0 
 * @returns The JSX component of the spell title.
 */
function SpellTitle( { model, selected = false, onClick=undefined}: {selected?: boolean, model: SpellModel, onClick?: MouseEventHandler}) {
    console.table({selected})
    return (<div className={(!selected ? styles.item: styles.selectedItem)} onClick={onClick}>{model.name}({model.technique}{model.form}{model.level.toString()})</div>)
}

/**
 * The component for designing spells.
 * @param props The spell designer panel properties.
 * @returns 
 */
export function SpellDesignerPanel(props : SpellDesignerPanelProps) {
    const [defaultSpells, setDefaultSpells] = useState(props.spells);
    const [selected, setSelected] = useState<SpellModel|undefined>(undefined);
    const [spells, setSpells] = useState(defaultSpells);
    const [unsaved, setUnsaved] = useState<boolean>(false);
    const [unsavedGuids, setUnsaveGuids] = useState([] as UUID[]);

    

    /**
     * Handle update of a spell. 
     * @param key The key of the spell.
     * @param newValues The new values of the spell.  
     */
    function handleUpdateSpell(key: string|UUID, newValues: SpellModel|NewSpellModel) {
        if (validUUID(key)) {
            const uuid = checkUUID(key);
            if ("guid" in newValues && newValues.guid !== uuid) {
                // GUID change - this should not happen.
                console.log("Updating guid of a spell is not allowed");
            } else {
                // Altering the values.
                setSpells((current) => (current.map( cursor => (getSpellKey(cursor) === key ? newValues : cursor)))); 
                if (!unsavedGuids.includes(uuid)) {
                    console.log("Added unsaved guid %s", uuid);
                    setUnsaveGuids( (current) => ([...current, uuid]));
                }
                setUnsaved(true);
            } 
            console.log("Altered spell with UUID %s", uuid);
        } else {
            // The spell does not have UUID.
            setSpells((current) => (current.map( cursor => (getSpellKey(cursor) === key ? newValues : cursor)))); 
            setUnsaved(true);
            console.log("Altered spell wihtout UUID");
        }
        setSelected(undefined);
    }

    /**
     * Create a new spell.
     * @param newSpell The added spell.
     */
    function createNewSpell(newSpell: NewSpellModel) {
        // The GUID is given to the spell when the spell is saved to the API.
        setSpells([...spells, newSpell]);
        setUnsaved(true);
    }

    /**
     * Internal action saving spells with action, and informing saving listeners.
     * The action does also perform altering the state of hte panel as necessary.
     * @param spells The spells saved.
     * @param unsavedGuids The affecte UUIDs. 
     */
    const saveChangesAction = async function (spells: SpellModel[], unsavedGuids: UUID[]|undefined) {
        try {
            if (props.saveChangesAction) {
                // Using sav chagnes action.
                console.log("Performing server action saving spells");
                await props.saveChangesAction(spells, unsavedGuids);
                console.log("Server action complete.")
            }
            if (props.onSaveChanges) {
                props.onSaveChanges(spells, unsavedGuids);
                setUnsaveGuids([]);
                setUnsaved(false);
                console.log("Spells saved");
            } else {
                setDefaultSpells(spells);
                setUnsaveGuids([]);
                setUnsaved(false);
                console.log("State saved");
            }
        } catch(error) {
            console.error("Updating spells failed due error: %s.", error);

        }
    };

    return <div className={styles.noHScroll}>
        <header className="header main"></header>
        <main className={"Main " + styles.noHScroll}>
            <span className="LeftView">
                <header className="header">Spell List</header>
                <main className="main column scroll">{spells.map( spell => (<SpellTitle selected={spell === selected} model={spell} key={getSpellKey(spell)} onClick={ (e) => {
                    if (selected === spell) {
                        setSelected(undefined);
                    } else {
                        setSelected(spell)
                    }
                }
            } />)) 
                }</main>
                <footer className={"footer flex row " + styles.noHScroll}>
                <button className="flex-item" disabled={!selected} onClick={ () => {
                    /**
                     * @todo Confirm dialog.
                     */

                    if (validUUID(selected?.guid)) {
                        const selectedUUID = checkUUID(selected?.guid);
                        if (!unsavedGuids.includes(selectedUUID)) {
                            setUnsaveGuids( uuids => ([...uuids, selectedUUID]))
                        }
                    }
                    setSpells( current => (current.filter( (spell) => (spell !== selected))));
                    setSelected(undefined);
                    setUnsaved(true);
                }}>
                    Delete
                </button>
                </footer>
            </span>
            <span className="MainView no scroll">
                <header className="header">{selected ? "Spell Editor" : "Spell Designer"}</header>
                <main className="main flex column scroll">
                        {selected ? (
                            <SpellEditorComponent defaultValue={selected} forms={props.forms} techniques={props.techniques} allRDTs={props.rdts}
                            onConfirm={
                                handleUpdateSpell.bind(undefined, getSpellKey(selected))
                            } onCancel={
                                // Do not alter the spell, and unselect the spell. 
                                () => {
                                    setSelected(undefined)
                                }
                            } />
                        ) : (
                            <SpellEditorComponent guidelines={props.guidelines} forms={props.forms} techniques={props.techniques} allRDTs={props.rdts} 
                            onConfirm={ (newSpell) => {
                                createNewSpell(newSpell);
                            }} />
                        )}
                </main>
            </span>
        </main>
        <footer className={"footer flex"}>
                    <button className="flex-item-1" disabled={!unsaved} onClick={
                        async () => {
                        await saveChangesAction(spells, unsavedGuids)
                        }} >Save changes</button>
                    <button className="flex-item-1" disabled={!unsaved} onClick={ 
                        (e) => {
                        setSpells(defaultSpells);
                        setUnsaveGuids([]);
                        setUnsaved(false);
                    }}>Revert changes</button>
                </footer>
    </div>
}    
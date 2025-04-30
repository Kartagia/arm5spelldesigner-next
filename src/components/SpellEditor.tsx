import { ArtModel, GuidelineModel, NewSpellModel, SpellModel } from "@/lib/spells";
import { SelectRDTComponent } from "./SelectRDTs";
import { RDT } from "@/lib/modifiers";
import { SelectArts } from "./SelectArts";
import UncontrolledSpellEditor from "./UncontrolledSpellEditor";



/**
 * The properties of the spell editor.
 */
export interface SpellEditorProperties {

    /**
     * The default value of an uncontrolled compoennt.
     */
    defaultValue?: SpellModel|Omit<SpellModel, "guid">;

    /**
     * The value of the controlled component.
     */
    value?: SpellModel;

    /**
     * The availale forms in addition to the forms available in the guidelines.
     */
    forms?: ArtModel[];

    /**
     * The availale techniques in addition to the techniques available in the guidelines.
     */
    techniques?: ArtModel[];


    /**
     * The available spell guidelines in addition to the guideline of the value. 
     */
    guidelines?: GuidelineModel[];

    /**
     * The RDTs available for the spell in addition to the RDTs chosen by the value.
     */
    allRDTs: RDT<"Range"|"Duration"|"Target">[];
}

/**
 * Event specific to spell editor component.
 */
export interface SpellEditorEvents {

    /**
     * The form has been changed.
     * @param newForm The new selected form or its abbreviation.
     */
    onFormChange?: (newForm: ArtModel|string) => void;


    /**
     * The technique has been changed.
     * @param newForm The new selected technique or its abbreviation.
     */
    onTechniqueChange?: (newTechnique: ArtModel|string) => void;

    /**
     * The guideline has been changed.
     * - The guideline change is folled by form and technique change,
     * if the form and technique changes.
     * @param newGuideline The new guideline.
     */
    onGuidelineChange?: (newGuideline: GuidelineModel) => void;

    /**
     * One of the sepll RDTs has changed.
     * @param newRDTs the new RDTs 
     * @param type The type of the RDT change, if only certain RDTs are affected.
     */
    onRDTChange?: (newRDTs: RDT<"Range"|"Duration"|"Target">[], type?: string) => void;

    /**
     * The spell size has changed.
     */
    onSizeChange?: (newSize: number) => void;

    /**
     * The editor is confirmed.
     * @param newSpell The new spell value.
     */
    onConfirm?: (newSpell: SpellModel|NewSpellModel) => void;

    /**
     * The editor has been cancelled.
     */
    onCancel?: () => void;
}


export function ControlledSpellEditor(props: Required<Pick<SpellEditorProperties, "value"> & Pick<SpellEditorEvents, "onConfirm">> & 
    Omit<SpellEditorProperties, "defaultValue"|"value"> & Omit<SpellEditorEvents, "onConfirm">
) {

    const setSize = (size: number|string) => {
        if (props.onSizeChange) {
            props.onSizeChange(Number(size));
        }
    }

    const handleRDTChange = (type: string|undefined, newValue: RDT<"Range"|"Duration"|"Target">[]) => {
        if (props.onRDTChange ) {
            props.onRDTChange(newValue, type);
        }
    }

    return (<section>
        <SelectArts forms={props.forms ?? []} techniques={props.techniques ?? []} technique={props.value?.form} form={props.value?.technique} 
        onSelect={(e) => { (e.type === "Form" ? props.onFormChange : props.onTechniqueChange)?.(e) }}
        />
        <section>
            <SelectRDTComponent allRDTs={props.allRDTs.filter( (rdt) => (rdt.type === "Range"))} onRDTChange={
                handleRDTChange.bind(undefined, "Range")
            }/>
            <SelectRDTComponent allRDTs={props.allRDTs.filter( (rdt) => (rdt.type === "Duration"))} onRDTChange={
                handleRDTChange.bind(undefined, "Duration")
            } />
            <SelectRDTComponent allRDTs={props.allRDTs.filter( (rdt) => (rdt.type === "Target"))} onRDTChange={
                handleRDTChange.bind(undefined, "Target")
            }/>
            <input type="number" min="0" max="10" name="size" value="0" onChange={ e => {setSize(e.target.value)}}/>
        </section>
    </section>)
}

/**
 * Create a new spell editor componetn.
 * @param props The properties of the spell editor.
 * @returns The component of the spell editor.
 */
export default function SpellEditorComponent(props: SpellEditorProperties & SpellEditorEvents ) {
    const allForms = new Set([...(props.forms ?? []).map( (art) => (art.abbrev)), ...(props.guidelines ?? []).map( gl => (gl.form))]);
    const allTechniques = new Set([...(props.techniques ?? []).map( (art) => (art.abbrev)), ...(props.guidelines ?? []).map( gl => (gl.technique))]);
    if (props.value) {
        // Controlled spell to edit.
        const { value, onConfirm = undefined, defaultValue = undefined, ...rest} = props;
        return (<ControlledSpellEditor {...rest} value={value} onConfirm={
            (newSpell: SpellModel) => {

            }
        } />)
    } else if (props.defaultValue) {
        // Uncontrolled spell to edit.
        const { defaultValue, value = undefined, ...rest} = props;
        return <UncontrolledSpellEditor defaultValue={defaultValue} {...rest} />
    } else {
        // THe editor is worth to create, as the confirmation is handled.
        const { defaultValue = undefined, value = undefined, ...rest} = props;
        return <UncontrolledSpellEditor {...rest} />
    }
}
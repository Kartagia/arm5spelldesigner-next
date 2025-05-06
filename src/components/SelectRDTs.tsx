import { ChangeEvent, HTMLProps, useEffect, useState } from "react";
import {equalRDTValue, getRDTValue, RDT} from '@/lib/modifiers'
import { UUID } from "crypto";
import { logger } from "../lib/logger";

/**
 * The default RDT model contais ranges, durations, and targets.
 */
export type RDTModel = RDT<string>;

/**
 * Get RDT key.
 * @param model The rdt model, whose key is returned.
 * @returns The key is the GUID, if the RDT has guid. Otherwise an unique key
 * is generated from type, name, and modifier.
 */
function getRDTKey(model: RDTModel):string {
    if (model.guid) {
        return model.guid;
    } else {
        return `${model.type}:${model.name}(${model.modifier})`;
    }
}

/**
 * Get secondary RDTs available.
 * @param allRTS The all RDTs available.
 * @param rdt The selected RDT.
 * @returns The array of secondary RDTs available. 
 */
function getSecondaryRDTs( allRTS: RDTModel[], rdt: RDTModel): RDTModel[] {
    const rdtKey = getRDTKey(rdt);
    const secondaryRDTs : RDTModel[] =  rdt.secondaryRDTs.reduce( 
        (result: RDTModel[], current: UUID) => {
        const added = allRTS.find( (tested) => (tested?.guid === current));
        if (added) {
            // The RDT is part of the show RDTs.
            result.push(added);
        }
        return result;
    }, [] as RDTModel[]);
    return secondaryRDTs;
}

/**
 * Selector component of a RDT value.
 * @param props The properties of the RDT value.
 * @returns 
 */
export function SelectRDTComponent( props : Omit<HTMLProps<HTMLSelectElement>, "value"|"defaultValue"> & {allRDTs: RDTModel[], choices?: RDTModel[], 
    defaultValue?: (RDTModel|RDTModel[]), value?: (RDTModel|RDTModel[]), onRDTChange?: (newValue: RDTModel[]) => void}) {
    const [value, setValue] = useState<RDTModel[]>(getRDTValue(props.defaultValue ?? props.value));
    const className: string = [ "rdt", ...(props.className?.split(" ") ?? [])].join(" ");
    useEffect( () => {
        logger.debug("Checking if important properties has changed");
        if (!equalRDTValue(props.defaultValue, value) || !equalRDTValue(props.value,value)) {
            logger.debug("Value has chagned. Changing the internal state of the component.");
            setValue(getRDTValue(props.defaultValue ?? props.value));
        }
    }, [props]);

    if (props.choices == undefined || props.choices.length === 0) {
        // The component is empty as there si no choices. 
        return <></>
    }

    const secondaryRDTs: RDTModel[] = (value.length > 0 ? getSecondaryRDTs(props.allRDTs, value[0]) : [] as RDTModel[]);

    const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const key = e.target.value;
        const newFirstValue = (props.choices ?? []).find( (rdt) => (getRDTKey(rdt) === key));
        if (newFirstValue) {
            let result:RDTModel[] = [newFirstValue];
            let secondaries = getSecondaryRDTs(props.allRDTs, result[result.length-1]);
            if (value.length > 1 && (secondaries.find( (rdt) => (getRDTKey(rdt) === getRDTKey(value[1]))))) {
                // The second value is still valid value. 
                result.push(...value.slice(1));
            }
            if (props.onRDTChange) {
                props.onRDTChange([]);
            }    
            if (!props.value) {
                // Uncontrolled component
                setValue(result);
            }
        } else {
            // Controlled component
            if (props.onRDTChange) {
                props.onRDTChange([]);
            }
            if (!props.value) {
                setValue([]);
            }
        }
    }


    (<><select className={className} onChange={ handleChange }>{
            (props.choices ?? []).map( (rdt) => (<option value={getRDTKey(rdt)}>{rdt.name}({rdt.modifier})</option>))
        }</select>
        <SelectRDTComponent disabled={ props.disabled } allRDTs={props.allRDTs} choices={secondaryRDTs} onRDTChange={ (selected:RDTModel[]) => {
            setValue( (current) => (current.length > 1 ? [current[0], ...selected]: current));
        }} /></>);
}
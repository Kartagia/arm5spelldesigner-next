"use client";

import { createRDTSet } from "@/lib/spells";
import { RDTSet } from "@/lib/spells";
import { equalRDTValue, RDT, rdtsToString, rdtToString, validRDTChange, changeRDT, getRDTValue } from "@/lib/modifiers";
import { UUID } from "crypto";
import { ChangeEvent, ChangeEventHandler, FormEvent, ReactNode, useEffect, useState } from "react";
import { ErrorList } from "./ErrorList";
import {logger} from "@/lib/logger";

export type RDTChangeEventHandler<TYPE extends string> = (name: string, type: TYPE, newValue: RDT<TYPE>[]) => void;



/**
 * The accumulator type handling accumulating generation of the RDT component parts. 
 */
type RDTComponentAccumulator<TYPE extends string> = {result: ReactNode[], done?:boolean, options: (RDT<TYPE>)[], current?: RDT<TYPE>}

export type RDTSelectorChangeHangler = (name: string, index: number, event: ChangeEvent<HTMLSelectElement>) => void;
/**
 * RDT selector compoennt.
 * @param props The selector compoentn properties.
 * @returns The selector component. 
 */
function RDTSelector<TYPE extends string>(props: {options: RDT<TYPE>[], value: RDT<TYPE>[], name: string, onChange?: RDTSelectorChangeHangler,
    errors?: Record<string, string[]>, 
}) {
    const [current, setCurrent] = useState(props.value);
    useEffect( () =>{
        logger.debug("Checking if [%s] %s is equal to %s: ", props.name, 
            rdtsToString(current), rdtsToString(props.value), equalRDTValue(current, props.value));
        if (!equalRDTValue(current, props.value)) {
            // The value has changed.
            setCurrent(getRDTValue(props.value));
            logger.debug("RDT[%s] value set to %s", props.name, rdtsToString(props.value));
        }
    }, [props]);


    return (<>
                {
                    current.reduce( (result: RDTComponentAccumulator<TYPE>, currentRdt, index, all) => {
                        if (result.done) {
                            return result;
                        } else if (result.options.find( (seeker) => (seeker === currentRdt || currentRdt.guid && (currentRdt.guid === seeker.guid)))) {
                            logger.debug("RDT[%s]@%d: Building selector %s out of [%s]", props.name, index, rdtToString(currentRdt), rdtsToString(result.options));
                            return {result: [...result.result, (
                                <select key={props.name + index} value={currentRdt.name} name={props.name + index} onChange={props.onChange?.bind(undefined, props.name, index)}>
                                    { result.options.map( (rdt) => (<option key={rdt.name} value={rdt.name}>{rdt.name}({rdt.modifier})</option>))}
                                </select>
                            )], ...props.options.reduce( (result: {options: RDT<TYPE>[], current?: RDT<TYPE>}, cursor) => (
                                cursor?.guid  && currentRdt.secondaryRDTs.includes(cursor.guid) ? {
                                    options: [...result.options, cursor], current: result.current ?? cursor
                                } as {options: RDT<TYPE>[], current?: RDT<TYPE>}: result), 
                                {options: [], cursor: undefined} as {options: RDT<TYPE>[], current?: RDT<TYPE>}
                            )}
                        } else {
                            return {...result, done: true}
                        }
                    
                }, {result: [] as ReactNode[], options: props.options, current: current[0]} ).result
            }
            {
                props.errors && <ErrorList errors={props.errors} errorKey={props.name} />
            }
    </>)
}


function defaultRDT<TYPE extends string>(value: RDT<TYPE>[]|undefined|null, defaultValue: RDT<TYPE>[]): RDT<TYPE>[] {
    if (value && value.length > 0) {
        return value;
    } else {
        return defaultValue;
    }
}

export function RDTPanel(props: {
    rdts: RDT<string>[], value?: RDTSet,
    onChange?: RDTChangeEventHandler<string>, onConfirm?: (selected: RDTSet)=>void, className?:string}) {
    const {rdts, onChange, onConfirm, className } = props;
    const [errors, setErrors] = useState({} as Record<string, string[]>)
    const [ranges, setRanges] = useState(rdts.filter( rdts => (rdts.type === "Range")) as RDT<"Range">[]);
    const [durations, setDurations] = useState(rdts.filter( rdts => (rdts.type === "Duration")) as RDT<"Duration">[]);
    const [targets, setTargets] = useState(rdts.filter( rdts => (rdts.type === "Target")) as RDT<"Target">[]);
    const [range, setRange] = useState<RDT<"Range">[]>(defaultRDT(props.value?.range, ranges.slice(0,1)));
    const [duration, setDuration] = useState<RDT<"Duration">[]>(defaultRDT(props.value?.duration, durations.slice(0,1)));
    const [target, setTarget] = useState<RDT<"Target">[]>(defaultRDT(props.value?.target, targets.slice(0,1)));
    const [currentRDT, setCurrentRDT] = useState<RDTSet>(createRDTSet(range, duration,target));
    var onUpdate : boolean = true; 
    const setOnUpdate = (value: boolean) => (onUpdate = value);
    useEffect( () => {
        if (props.value !== undefined && props.value !== currentRDT) {
            const newRDT = createRDTSet(
                defaultRDT(props.value?.range,  ranges.slice(0,1)), 
                defaultRDT(props.value?.duration,  durations.slice(0,1)),
                defaultRDT(props.value?.target,  targets.slice(0,1)));
            logger.debug("The value has changed: from (%s) to (%s)", 
                [rdtsToString(currentRDT.range, "R:"), 
                    rdtsToString(currentRDT.duration, "D:"), 
                    rdtsToString(currentRDT.target, "T:")].join(","),
                [rdtsToString(newRDT.range, "R:"), 
                rdtsToString(newRDT.duration, "D:"), 
                rdtsToString(newRDT.target, "T:")].join(","));
            setCurrentRDT(newRDT);
            setRange(newRDT.range);
            setDuration(newRDT.duration);
            setTarget(newRDT.target);
        } else {
            logger.debug("Tneo RDTs has not changed");
        }
    }, [props]);
    useEffect( () => {
        if (onChange ) {
            let changed = false;
            if (!equalRDTValue(currentRDT.range, range)) {
                logger.debug("Reporting range change");
                changed = true;
                onChange("range", "Range", range);
            }
            if (!equalRDTValue(currentRDT.duration, duration)) {
                logger.debug("Reporting duration change");
                changed = true;
                onChange("duration", "Duration", duration);
            }
            if (!equalRDTValue(currentRDT.target, target)) {
                logger.debug("Reporting target change");
                changed = true;
                onChange("target", "Target", target);
            }
        }
    }, [range, duration, target]);
    setOnUpdate(false);

    function handleSubmit( data: FormData ) {

        data.append("range", JSON.stringify(range));
        data.append("duration", JSON.stringify(duration));
        data.append("target", JSON.stringify(target));
        
        if (onConfirm) {
            onConfirm(currentRDT)
        }
    }

    


    /**
     * Handle change of rdt value. The handler should be bound with value name, and the index of the select compont.
     * @param name The name of the variable. 
     * @param index The index of hte event
     * @param event The change event.
     */
    function handleChange(name: string, index: number, event: ChangeEvent<HTMLSelectElement>) {
        setOnUpdate(true);
        const newValue = event.currentTarget.value;
        switch (name) {
            case "range":
                console.log("Handling value change: %s at %d from %s to %s", name, index, range?.[index] ? rdtToString(range?.[index]) : "none", event.currentTarget.value);
                const newRange = ranges.find( rdt => (rdt.name === newValue));
                if (newRange && validRDTChange(range, index, newRange)) {
                    const newValue = changeRDT(range, index, newRange)
                    setRange( newValue );
                    logger.debug(" Range[%d] set to %s => %s", index, rdtToString(newRange), rdtsToString(newValue));
                }  else {
                    event.preventDefault();
                    logger.debug("Invalid change: %s at %d to %s", name, index, newRange ? rdtToString(newRange) : "none")
                }
                break; 
            case "duration":
                console.log("Handling %s value change at %d from %s to %s", name, index, duration?.[index] ? rdtToString(duration?.[index]) : "none", event.currentTarget.value);
                const newDuration = durations.find( rdt => (rdt.name === newValue));
                if (newDuration && validRDTChange(duration, index, newDuration)) {
                    const newValue = changeRDT(duration, index, newDuration)
                    setDuration( newValue );
                    logger.debug(" Duration[%d] set to %s => %s", index, rdtToString(newDuration), rdtsToString(newValue));
                }  else {
                    event.preventDefault();
                    logger.debug("Invalid %s change: Index: %d,  to %s", name, index, newDuration? rdtToString(newDuration) : "none")
                }
                break;
            case "target":
                console.log("Handling %s value change at %d from %s to %s", name, index, target?.[index] ? rdtToString(target?.[index]) : "none", event.currentTarget.value);
                const newTarget = targets.find( rdt => (rdt.name === newValue));
                if (newTarget && validRDTChange(target, index, newTarget)) {
                    const newValue = changeRDT(target, index, newTarget);
                    setTarget( newValue );
                    logger.debug(" Target[%d] set to %s => %s", index, rdtToString(newTarget), rdtsToString(newValue));

                }  else {
                    event.preventDefault();
                }
                break;
            default:
                logger.debug("Unknown RDT variable '%s'", name);
        }
        setOnUpdate(false);
    }
    return (<form action={ handleSubmit }>
        <div className={className ? "flex row "+ className : "flex row"}>
            <div className="flex column">
                <header className="title">Range</header>
                <main>
                    <RDTSelector name="range" options={ranges} value={range} onChange={handleChange}/>
                </main>
            </div>
            <div className="flex column">
            <header className="title">Duration</header>
            <main>
                <RDTSelector name="duration" options={durations} value={duration} onChange={handleChange} />
            </main>
            </div>
            <div className="flex column">
            <header className="title">Target</header>
                <main>
                   <RDTSelector name="target" options={targets} value={target} onChange={handleChange} />
                </main>
            </div>
            <footer>
            </footer>
        </div>
        {errors && <ErrorList errors={errors} errorKey="generic"/>}
    </form>);
}
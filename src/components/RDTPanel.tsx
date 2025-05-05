"use client";

import { createRDTSet } from "@/lib/spells";
import { RDTSet } from "@/lib/spells";
import { RDT, rdtsToString, rdtToString } from "@/lib/modifiers";
import { UUID } from "crypto";
import { ChangeEvent, ChangeEventHandler, FormEvent, ReactNode, useEffect, useState } from "react";

export function ErrorList(props: {errors: Record<string, string[]>, errorKey?: string, className?: string}) {

    return <ul className={props.className ?? "error"}>
        {( props.errorKey ? (props.errorKey in props.errors ? [props.errorKey] : []): Object.getOwnPropertyNames(props.errors) ).flatMap(
            (key) => (props.errors[key].map( (item) => (<li key={key + "." + item}>{item}</li>)))
        )}
    </ul>
}

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
    return (<>
                {
                    props.value.reduce( (result: RDTComponentAccumulator<TYPE>, rdt, index, all) => {
                        if (result.done) {
                            return result;
                        } else if (result.options.find( (seeker) => (seeker === rdt || rdt.guid && (rdt.guid === seeker.guid)))) {

                            return {result: [...result.result, (
                                <select key={props.name + index} name={props.name + index} onChange={props.onChange?.bind(undefined, props.name, index)}>
                                    { result.options.map( (rdt) => (<option defaultChecked={rdt === result.current} key={rdt.name} value={rdt.name}>{rdt.name}({rdt.modifier})</option>))}
                                </select>
                            )], ...props.options.reduce( (result: {options: RDT<TYPE>[], current?: RDT<TYPE>}, cursor) => (
                                cursor?.guid  && rdt.secondaryRDTs.includes(cursor.guid) ? {
                                    options: [...result.options, cursor], current: result.current ?? cursor
                                } as {options: RDT<TYPE>[], current?: RDT<TYPE>}: result), 
                                {options: [], cursor: undefined} as {options: RDT<TYPE>[], current?: RDT<TYPE>}
                            )}
                        } else {
                            return {...result, done: true}
                        }
                    
                }, {result: [] as ReactNode[], options: props.options, current: props.value[0]} ).result
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

export function RDTPanel({rdts, onChange, onConfirm, className, ...props}: {
    rdts: RDT<string>[], value?: RDTSet,
    onChange?: RDTChangeEventHandler<string>, onConfirm?: (selected: RDTSet)=>void, className?:string}) {
    const [errors, setErrors] = useState({} as Record<string, string[]>)
    const [ranges, setRanges] = useState(rdts.filter( rdts => (rdts.type === "Range")) as RDT<"Range">[]);
    const [durations, setDurations] = useState(rdts.filter( rdts => (rdts.type === "Duration")) as RDT<"Duration">[]);
    const [targets, setTargets] = useState(rdts.filter( rdts => (rdts.type === "Target")) as RDT<"Target">[]);
    const [range, setRange] = useState<RDT<"Range">[]>(defaultRDT(props.value?.range, ranges.slice(0,1)));
    const [duration, setDuration] = useState<RDT<"Duration">[]>(defaultRDT(props.value?.duration, durations.slice(0,1)));
    const [target, setTarget] = useState<RDT<"Target">[]>(defaultRDT(props.value?.target, targets.slice(0,1)));
    const [currentRDT, setCurrentRDT] = useState<RDTSet>(createRDTSet(range, duration,target));
    useEffect( () => {
        if (onChange ) {
            let changed = false;
            if (currentRDT.range !== range) {
                changed = true;
                onChange("range", "Range", range);
            }
            if (currentRDT.duration !== duration) {
                changed = true;
                onChange("duration", "Duration", duration);
            }
            if (currentRDT.target !== target) {
                changed = true;
                onChange("target", "Target", target);
            }
        }
    }, [range, duration, target]);

    function handleSubmit( data: FormData ) {

        data.append("range", JSON.stringify(range));
        data.append("duration", JSON.stringify(duration));
        data.append("target", JSON.stringify(target));
        
        if (onConfirm) {
            onConfirm(currentRDT)
        }
    }

    function validRDTChange<TYPE extends string>(current: RDT<TYPE>[], index: number, newValue: RDT<TYPE>): boolean {
        return (index === 0) || (index === current.length && ( index === 0 || newValue.guid != null && current[current.length-1].secondaryRDTs.includes(newValue.guid)) );
    }

    type RDTChangeAccumulator<TYPE extends string> = { result: RDT<TYPE>[], done?: boolean, current?: RDT<TYPE> }

    function changeRDT<TYPE extends string>(current: RDT<TYPE>[], index: number, newValue: RDT<TYPE>) {
        if (index === current.length -1 && newValue === current[current.length-1]) {
            // No change.
            return current;
        } else if (!validRDTChange(current, index, newValue)) {
            // Change is rejected.
            return current;
        }

        // Createing new value by cutting invalidated values from tail.
        return [...current.slice(0, index), newValue, ...( current.slice(index+1).reduce( 
            (result: {done?: boolean, result: RDT<TYPE>[], cursor?: RDT<TYPE>}, current: RDT<TYPE>) => {
                if (result.done || result.cursor == null) {
                    return result;
                } else if (current.guid && result.cursor?.secondaryRDTs?.includes(current.guid)) {
                    return {result: [...result.result, current], cursor:current};
                } else {
                    return {...result, done: true};
                }
            }, { cursor: newValue, result: [] }).result) ];
    }

    /**
     * Handle change of rdt value. The handler should be bound with value name, and the index of the select compont.
     * @param name The name of the variable. 
     * @param index The index of hte event
     * @param event The change event.
     */
    function handleChange(name: string, index: number, event: ChangeEvent<HTMLSelectElement>) {
        const newValue = event.currentTarget.value;
        switch (name) {
            case "range":
                console.log("Handling value change: %s at %d from %s to %s", name, index, range?.[index] ? rdtToString(range?.[index]) : "none", event.currentTarget.value);
                const newRange = ranges.find( rdt => (rdt.name === newValue));
                if (newRange && validRDTChange(range, index, newRange)) {
                    setRange( current => changeRDT(current, index, newRange));
                }  else {
                    event.preventDefault();
                    console.log("Invalid change: %s at %d to %s", name, index, newRange ? rdtToString(newRange) : "none")
                }
                break; 
            case "duration":
                const newDuration = duration.find( rdt => (rdt.name === newValue));
                if (newDuration && validRDTChange(duration, index, newDuration)) {
                    setDuration( current => changeRDT(current, index, newDuration) );
                }  else {
                    event.preventDefault();
                }
            case "target":
                const newTarget = target.find( rdt => (rdt.name === newValue));
                if (newTarget && validRDTChange(target, index, newTarget)) {
                    setTarget( current => changeRDT(current, index, newTarget) );
                }  else {
                    event.preventDefault();
                }
            default:

        }
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
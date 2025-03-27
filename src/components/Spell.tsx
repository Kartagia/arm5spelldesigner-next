import { GUID } from '@/data/guid';
import { ArtKey, RDT, RDTInfo, RDTValue, Spell, SpellPojo, SpellRequisite } from '@/data/spells';
import React, { ChangeEventHandler, createElement, FormEventHandler, MouseEventHandler, PropsWithChildren, ReactElement, Ref, Suspense, useId, useRef, useState } from 'react';
import { ArtComponent, ArtPojo } from './Art';
import Art, { Form, Technique } from '@/data/arts';
import Carousel from './Carousel';
import { getRandomValues } from 'crypto';
import { equalRDT, getRDTInfo } from "@/data/rdtData";
import { urlToHttpOptions } from 'url';
import { Style } from 'util';
import { redirect } from 'next/dist/server/api-utils';
import { htmlCollection2Array, promised } from '../lib/utils';
import { fetchArts, fetchArt } from '@/data/artData';

type ViewMode = "row"|"card"|""

interface SpellViewProps {
    mode: ViewMode
}

/**
 * Fetch RDT information of a GUID.
 * @param id The identifier of the fetched RDT.
 * @returns The promise of the RDT information.
 */
function fetchRDTInfo(id: GUID): Promise<RDTInfo> {
    return new Promise( (resolve, reject) => {
        getRDTInfo(id).then(resolve, reject);
    });
}

function rdtValuesToRDTInfo( source: RDTValue[]|undefined ): RDTInfo|undefined {
    if (source === undefined || source.length === 0) {  
        return undefined;
    } else {
        return {
            guid: source[0].guid,
            name: source[0].name,
            modifier: source[0].modifier,
            description: source[0].description,
            secondaryRDTs: source.slice(1)
        }
    }
}

/**
 * 
 * @param source The source of the RDT.
 * @return The returned value:
 * - an undefined value for an undefined value.
 * - a RDTInfo for a RDTInfo or RDT without any secondary RDTs.
 * - a promise of RDTInfo for a RDT with secondary RDTs we must fetch.
 */
function createRDTInfo( source: RDT|RDTInfo|undefined): RDTInfo|undefined|Promise<RDTInfo> {
    if (source) {
        const secondaryRDTs = source.secondaryRDTs.map( (value) => (value instanceof GUID ? fetchRDTInfo(value) : value));
        if (secondaryRDTs.every( rdt => (! (rdt instanceof Promise))) ) {
            return {
                guid: source.guid,
                name: source.name,
                modifier: source.modifier,
                description: source.description,
                secondaryRDTs: (secondaryRDTs as (RDT|RDTInfo)[]).map( (value) => {
                    return value
                })
            };
        } else {
            return new Promise( async (resolve, reject) => {
                Promise.all( secondaryRDTs.map( (value) => (value instanceof Promise ? value: Promise.resolve(value)))).then(
                    (result) => {
                        resolve({
                            guid: source.guid,
                            name: source.name, 
                            modifier: source.modifier,
                            description: source.description,
                            secondaryRDTs: result
                        });
                    }, 
                    reject
                )
            });
        }        
    }
    return source;
}

function isGUID(value: any) {
    if (value instanceof GUID) {
        return true;
    }
    return typeof value === "string" && GUID.GUIDRegex().test(value);
}

function checkGUID(value: any, options: {message?: string, lenient?: boolean} = {}): GUID {
    return value instanceof GUID ? value : GUID.fromString(value, options);
}


function createArt(name: string, type: string, abbrev: string|undefined = undefined): ArtPojo {
    const art = new Art(name, type, abbrev, undefined, GUID.createV4());
    return art;
}

export async function SpellRequisiteComponent(props: SpellRequisite & SpellViewProps): Promise<ReactElement> {

    switch (props.mode) {
        case "row":
        case "card":
        default:
            return new Promise((resolve, reject) => {
                if (isGUID(props.art)) {
                    fetchArt(checkGUID(props.art)).then(
                        (art) => {
                            return (<span>{art.abbrev.toString()}</span>)
                        }
                    )
                } else {
                    resolve(<span>{props.art.toString()}</span>)
                }
            });
    }
}

/**
 * Solve a reference to an art.
 * @param param0 The art referece as property "ref". 
 * @returns The promise of the referred art.
 */
export async function ArtReference({ref}: {ref: GUID|ArtKey|Art}): Promise<Art> {
    return fetchArt(ref instanceof Art ? ref.name : ref);
}

/**
 * The art option properties.
 */
export interface ArtOptions {
    /**
     * The techniques available for the spell.
     */
    techniques: Technique[],
    /**
     * The forms available for the spell. 
     */
    forms: Form[]
}

/**
 * The basic component properties.
 */
export interface BasicComponentProps<TYPE> {
    /**
     * Is the component read only.
     * @default false
     */
    readonly?:boolean;

    /**
     * Is the component disabled.
     * @default false
     */
    disabled?:boolean;

    /**
     * The value of a controlled component.
     */
    value?:TYPE;

    /**
     * The initial value of an uncontrolled component.
     * - {@link BasicComponentProps#value} override this option.
     */
    defaultValue?:TYPE;

    /**
     * Is the component editor.
     * @default false
     */
    editor?:boolean;

    /**
     * Is the component editor by default, but can alter its internal state.
     * - {@link BasicComponentProps#editor} override this option.
     * @default false
     */
    defaultEditor?:boolean;

    /**
     * The identifier unique within document.
     * @default undefined The component does not have identifier.
     */
    id?:string;

    /**
     * The class name of the component.
     */
    className?: string|string[]
}

/**
 * The properties of the RDT component.
 */
export interface RDTComponentSpecificProps<TYPE=Element> {
    /**
     * The initial value of the component.
     */
    defaultValue?: RDTInfo[],

    /**
     * The choices of the RDT values in edit mode.
     */
    choices?: RDTInfo[],

    /**
     * The label of the editor component.
     */
    label?: string,

    /**
     * The name of the editor component value in form.
     */
    name?: string,

    /**
     * The view mode of the component.
     */
    mode?: ViewMode,

    /**
     * 
     */
    ref?:Ref<TYPE>;
}

/**
 * The RDT component events.
 */
export interface RDTComponentEvents<TARGET extends EventTarget> {

    /**
     * The RDT component has changed.
     * @param newValues The current values after change.
     * @param oldValues The old values.
     */
    onChange: (newValues: RDTInfo[], oldValues: RDTInfo[], target: TARGET|null)=>void;

    /**
     * Handle the change of the editor.
     * @param isEditor The new editor state.
     */
    onEditorChange: (isEditor: boolean)=>void;

    /**
     * The compont was clicked.
     */
    onClick: MouseEventHandler<TARGET>;
}

/**
 * The properties of the RDT component.
 */
export type RDTComponentProps<TYPE> = (RDTComponentSpecificProps<TYPE> & BasicComponentProps<RDTInfo[]> & Partial<RDTComponentEvents<HTMLElement>>)

/**
 * RDT editor component creates a RDT editor.
 */
export function RDTEditor(props: RDTComponentProps<HTMLDivElement>) {
    const myself: Ref<HTMLDivElement> = useRef(null);
    const [editor, setEditor] = useState(props.editor ?? props.defaultEditor ?? false);
    const [value, setValue] = useState(props.value ?? props.defaultValue ?? []);
    const controlled = (props.value !== undefined);
    const disabled = !editor || props.disabled || false;

    const changeEditMode = (newEditMode: boolean) => {
        if (!controlled) {
            setEditor(newEditMode);
        }
        if (props.onEditorChange) {
            props.onEditorChange(newEditMode);
        }
    }

    const changeValue = (newValue: RDTInfo[]) => {
        const oldValue = value;
        if (!controlled) {
            setValue(newValue);
        }
        if (props.onChange) {
            props.onChange(newValue, oldValue, myself.current)
        }
        
    }

    const choices: RDTInfo[] = [...(props.choices ?? [])]

    return (<div id={props.id}>
        {
            value.map( (rdt, index) => {
            
                // Creating error map.
                const errors: (string|ReactElement|undefined)[] = value.reduce( (res: (string|ReactElement|undefined)[], rdt, index, rdts) => {
                    if (index > 0 && rdts[index-1].secondaryRDTs.every((cursor) => (!equalRDT(cursor, rdt)))) {
                        // erroneous rdt.
                        res.push("Invalid value");
                    } else {
                        res.push(undefined);
                    }
                    return res;
                }, []);

                return (<><select value={rdt.guid?.toString() ?? rdt.name} key={rdt.name}
                
                disabled={props.readonly || props.disabled}
                
                onChange={
                    (event) => {
                        const options = htmlCollection2Array(event.target.options);
                        const currentSelected = htmlCollection2Array(event.target.selectedOptions);
                        const newSelected:RDTInfo[] = currentSelected.reduce( 
                            (res : RDTInfo[], current : Element) => {
                                const index = options.indexOf(current)
                                if (index >= 0) {
                                    res.push( index === 0 ? rdt : choices[index-1]);
                                }
                                return res;
                            }, [] as RDTInfo[]);

                        changeValue(newSelected);
                    }
                }>{
                    (choices.find( cursor => (equalRDT(rdt, cursor))) ? choices : [rdt, ...choices]).map( 
                    (current, index) => (
                        <option key={current.guid?.toString() ?? current.name} value={current.guid?.toString() ?? current.name}>{current.name}</option>
                    ))
                }</select>
                {
                    errors.map( (error, index) => {
                        <div key={typeof error === "string" ? error : `error-${index}`} className="error">{error}</div>
                    })
                }
            </>)
        })
        }
    </div>)
}
/**
 * A RDT component handles showing, and possibly editing, the component.
 * @param props The properties of the component.
 * @returns The React Element.
 */
export function RDTComponent(props: RDTComponentProps<HTMLDivElement>) {
    const myself: Ref<HTMLDivElement> = useRef<HTMLDivElement>(null);
    const myref: Ref<HTMLDivElement>|undefined = props.ref;
    const [isEditor, setEditor] = useState(props.editor ?? props.defaultEditor ?? false);
    const [value, setValue] = useState(props.value ?? props.defaultValue ?? []);
    const controlled = (props.value !== undefined);
    const {id=undefined, onChange=undefined, onClick=undefined, editor=false, defaultEditor=false, 
        value:propValue=undefined, defaultValue=undefined, ...rest} = props;

    /**
     * Handles the change of edit mode taking into account control status of the component.
     * @param newEditMode The new edit mode.
     */
    const changeEditMode = (newEditMode: boolean) => {
        if (!controlled) {
            setEditor(newEditMode);
        }
        if (props.onEditorChange) {
            props.onEditorChange(newEditMode);
        }
    }

    /**
     * Handles the change of compoennt value taking into account control status of the component.
     * @param newEditMode The new edit mode.
     */
    const changeValue = (newValue: RDTInfo[]) => {
        if (value !== newValue) {
            const oldValue = [...value];
            if (!controlled) {
                setValue(newValue);
            }
            if (props.onChange) {
                props.onChange(newValue, oldValue, myself.current)
            }
        }
    }

    if (isEditor) {
        return <RDTEditor id={props.id} value={value} onChange={changeValue} editor={editor} onEditorChange={changeEditMode} {...rest} />
    } else {
        return (<div id={props.id} ref={myself}>
            {value.map( (rdt, index) => (<RDTEntryComponent value={rdt} onClick={e => {changeEditMode(true)}}
                error={(index > 0 && value[index-1].secondaryRDTs.find( cursor => (equalRDT(cursor, rdt))) ? undefined : "Invalid rdt value")} />))}
        </div>)
    }
}

/**
 * The properties of the RDT entry component.
 */
export interface RDTEntryComponentProps {
    /**
     * The current RDT info value.
     */
    value: RDTInfo|undefined,
    /**
     * The choices of the primary RDT values on edit mode.
     */
    choices?: RDTInfo[],
    /**
     * The label of the editor component.
     */
    label?: string,
    /**
     * The identifier of the editor component or the main component.
     */
    id?: string,
    /**
     * The mode of the component.
     */
    mode?:ViewMode,
    /**
     * Is the component read only.
     * - A readonly component cannot be edited. 
     */
    readonly?:boolean,
    /**
     * Is the component in edit mode by defualt.
     */
    defaultEdit?:boolean,

    /**
     * The error message shown on the component.
     */
    error?: string|ReactElement,
    onClick?: MouseEventHandler<HTMLElement>,
    onChange?: (selected: RDTInfo[]) => void,
    disabled?:boolean;
}

/**
 * A RDT editor component represents a component with editor view of the RDT.
 * @param props The editor component properties.
 * @returns The editor component.
 */
export function RDTEntryEditor(props: RDTEntryComponentProps): ReactElement {

    const items = [ ...(props.value ? [props.value]: []), ...(props.choices || [])];
    const [selected, setSelected] = useState((props.value ? [props.value] : [] as Element[]));

    const handleChange:ChangeEventHandler<HTMLSelectElement> = (e) => {
        const options = htmlCollection2Array(e.target.options);
        const selectedOptions = htmlCollection2Array(e.target.selectedOptions);
        
        const [currentSelected, selectedRdts] = selectedOptions.reduce( (res, option) => {
            const index = options.indexOf(option);
            res[0].push(option);
                
            if (index >= 0) {
                res[1].push(items[index]);
            }
            
            return res;
        }, [[], []] as [Element[], RDTInfo[]]);
        setSelected(currentSelected);
        if (props.onChange) {
            props.onChange(selectedRdts);
        }
    };

    switch (props.mode) {
        case "row":
        case "card":
        default:
            return <span>{props.label && props.id && (<label htmlFor={props.id}>{props.label}</label>)}{
                <select disabled={props.disabled} id={props.id} name={props.label} onChange={handleChange}>
                    {
                    items.map( rdt => (<option key={rdt.name} value={rdt.name}>{rdt.name}</option>))
                }</select>
            }</span>
    }
}

/**
 * A component for showing a RDT value.
 * @param props The properties of the component.
 * @returns The react element of the RDT component.
 */
export function RDTEntryComponent(props: RDTEntryComponentProps): ReactElement {
    const {onClick=undefined, ...editProps} = props;
    const [editing, setEditing] = useState(!props.readonly && props.defaultEdit);
    const handleClick : MouseEventHandler<HTMLElement>|undefined = !editing ? (e) => {
        setEditing(true);
        if (onClick) {
            onClick(e);
        }
    } : undefined;

    if (editing) {
        return (<RDTEntryEditor {...editProps}></RDTEntryEditor>)
    } else {
        switch (props.mode) {
            case "row":
                return (<td onClick={handleClick} id={props.id}>{props.value ? props.value.name : "None"}</td>)
            case "card":
                return (<article id={props.id} onClick={handleClick}>
                    <header>{props.label}</header>
                </article>)
            default:
                return <span id={props.id} onClick={handleClick}>{`${props.value ? props.value.name : "None"}`}</span>;
        }
    }
}

export function ArtEditorComponent(props: { 
    id?: string, 
    choices: Art[],
    value?: ArtKey|GUID|Art, onChange?: (art: Art|ArtKey|undefined) => void
}) {

    const handleChange = (arts: (Art|ArtKey)[], index: number|undefined) => {
        if (props.onChange) {
            if (index && index >= 0) {
                props.onChange(arts[index]);
            } else {
                props.onChange(undefined);
            }
        }
    }

    const handleSelect = (art: Art|undefined, index: number|undefined) => {
        if (props.onChange) {
            props.onChange(art);
        }
    }

    if (props.value instanceof GUID) {
        return (<Suspense fallback="Loading">{
            fetchArt(props.value).then(
                art => {
                    const arts = [ ...(new Set<Art>([...props.choices, art]).values())];
                    return (<Carousel values={arts} onChange={ (index) => {
                        handleChange(arts, index)
                    }} onSelect={handleSelect} >
                        {arts.map( art => (<span>{art.name}</span>))}
                    </Carousel>)
                },
                error => {
                    throw error;
                }
            )
        }</Suspense>)
    } else {
        const arts = [ ...(new Set<Art>([...props.choices, ...(props.value instanceof Art ? [props.value] : [])]).values())];
        return (<Carousel values={arts} 
            onChange={ (index) => {
                handleChange(arts, index)
            } 
        }>{arts.map( art => (<span>{art.name}</span>))}</Carousel>)
    }
}

export function SpellEditorComponent(props: PropsWithChildren<SpellPojo & SpellViewProps & ArtOptions>): ReactElement {
    const [spell, setSpell] = useState( {} as Partial<Spell> );
    const [techniques, setTechniques] = useState(props.techniques || [props.technique]);
    const [forms, setForms] = useState(props.forms || [props.form]);
    const id = useId();

    const createElementId = (fieldName: string) => (`${id}.${fieldName}`);

    const submitHandler: FormEventHandler<HTMLFormElement> = (e) => {
        var formData = new FormData();
        
    }

    const handleNameChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        const newName = e.target.value;
        if (newName.length > 0) {
            setSpell( (current) => ({...current, name: newName}));
        } else {
            setSpell( (current) => ({...current, name: undefined}));
        }
    }

    
    switch (props.mode) {
        case "row":
            return (<tr>
                <td><input id={createElementId("name")} name="name" onChange={handleNameChange}>{spell.name}</input></td>
                {
                    [ 
                        ["technique", techniques, () => { return spell?.technique }, 
                            (newValue: Art|ArtKey|undefined) => {
                                setSpell( (current) => ({...current, technique: newValue}));
                            }
                        ] as [string, Art[], () => ArtKey|Art|GUID|undefined, (newValue: Art|ArtKey|undefined) => void ], 
                        ["form", forms, () => { return spell?.form },
                            (newValue: Art|ArtKey|undefined) => {
                                setSpell( (current) => ({...current, form: newValue}));
                            }
                        ]  as [string, Art[], () => ArtKey|Art|GUID|undefined, (newValue: Art|ArtKey|undefined) => void ]
                    ].map( ([fieldName, arts, getter, setter]) => {
                        return (<td key={fieldName}><ArtEditorComponent value={getter()} choices={arts} onChange={
                            (newValue) => {
                                setter(newValue);
                            }
                        }></ArtEditorComponent></td>)
                }
                )}
            </tr>)
        case "card":
            return (<div>
                <header><label htmlFor={createElementId("name")}>Name</label><input id={createElementId("name")} name="name" onChange={handleNameChange}>{spell.name}</input></header>
                <main></main>
                <footer></footer>
            </div>)
        default: 
            return (<form onSubmit={submitHandler}>
                <label htmlFor={createElementId("name")}>Name</label><input type="text" id={createElementId("name")}>{spell.name}</input>
                {
                    [ 
                        ["technique", techniques, () => { return spell?.technique }, 
                            (newValue: Art|ArtKey|undefined) => {
                                setSpell( (current) => ({...current, technique: newValue}));
                            }
                        ] as [string, Art[], () => ArtKey|Art|GUID|undefined, (newValue: Art|ArtKey|undefined) => void ], 
                        ["form", forms, () => { return spell?.form },
                            (newValue: Art|ArtKey|undefined) => {
                                setSpell( (current) => ({...current, form: newValue}));
                            }
                        ]  as [string, Art[], () => ArtKey|Art|GUID|undefined, (newValue: Art|ArtKey|undefined) => void ]
                    ].map( ([fieldName, arts, getter, setter]) => {
                        return (<ArtEditorComponent key={fieldName} value={getter()} choices={arts} onChange={
                            (newValue) => {
                                setter(newValue);
                            }
                        }></ArtEditorComponent>)
                }
                )}
            <input type="text" id={createElementId("level")}><label>Level</label></input>
            { ([
                ["range", spell.ranges],
                ["duration", spell.durations], 
                ["target", spell.targets]] as Array<[string, RDTValue[]|undefined]>).map( ([type, current]) => {
                    const result = rdtValuesToRDTInfo(current);
                    if (result) {
                        const id = createElementId(type);
                        return (<RDTEntryComponent id={id} mode={props.mode} label={type} key={id} value={result}></RDTEntryComponent>);
                    } else {
                        throw (<span><label htmlFor={createElementId(type)}>{type.substring(0,1).toUpperCase() + type.substring(1)}</label>None</span>)
                    }
            })
            }
            </form>)
        }
}

export default async function SpellComponent(props: PropsWithChildren<SpellPojo & SpellViewProps>): Promise<ReactElement> {

    const requisites : SpellRequisite[] = await Promise.all((props.requisites.map( async req => (isGUID(req.art)?{...req, 
        art: new ArtKey((await fetchArt(checkGUID(req))).abbrev.toString())}:{...req}))));
    const spell = {
        requisites,
        name: props.name,
        level: props.level,
        ranges: props.ranges,
        durations: props.durations,
        targets: props.targets,
        technique: props.technique,
        form: props.form
    };

    switch (props.mode) {
        case "row":
            return (<tr><td>{spell.name}</td><td><Suspense fallback={"Loading"}>{new Promise( (resolve, reject) => {
                if (spell.technique instanceof GUID) {
                    fetchArt(spell.technique).then( (art) => {
                        resolve(<ArtComponent name={art.name} abbrev={art.abbrev} type={art.type} style={art.style} mode={props.mode} />);
                    })
                } else if (spell.technique instanceof ArtKey) {
                    const art : Art|undefined = promised(fetchArts( (_id:string, value:Art) => (
                        value.abbrev.toString() === spell.technique?.toString())).then(
                            values => {
                                if (values.length > 0) {
                                    return values[0].value
                                } else {
                                    return undefined;
                                }
                            }
                        ));
                    if (art) {
                       resolve(<ArtComponent name={art.name} abbrev={art.abbrev} type={art.type} style={art.style} mode={props.mode} />);
                    } else {
                        reject();
                    }
                } else {
                    const art = spell.technique;
                    resolve(<ArtComponent name={art.name} abbrev={art.abbrev} type={art.type} style={art.style} mode={props.mode} />);
                }
            })}</Suspense></td><td></td><td>{spell.level}</td><td>{
                spell.requisites.map(
                    (requisite, index) => (<Suspense key={index} fallback={"Loading"}>
                    <SpellRequisiteComponent requisite={requisite.requisite} art={requisite.art} value={requisite.value} mode={props.mode}/></Suspense>
                    )
                ).join("")
                }</td><td>{
                    spell.ranges.map( range => (<span>{range.name}</span>) ).join("/")
                }</td><td>{
                    spell.durations.map( range => (<span>{range.name}</span>) ).join("/")
                }</td><td>{
                    spell.targets.map( range => (<span>{range.name}</span>) ).join("/")
                }</td></tr>)
        case "card":
            return <div>
                <header><h1>{spell.name}</h1></header>
                <main>
                    <article><b>Level:</b>{spell.level}</article>
                    <article><b>Requisites:</b>{
                        spell.requisites.map( 
                            (requisite, index) => (<Suspense key={index} fallback={"Loading"}>
                                <SpellRequisiteComponent requisite={requisite.requisite} art={requisite.art} value={requisite.value} mode={props.mode}/></Suspense>
                                )            
                        )
                    }</article>
                    <article><b>Range:</b>{
                    spell.ranges.map( range => (<span>{range.name}</span>) ).join("/")
                }</article>
                    <article><b>Duration:</b>{
                    spell.durations.map( range => (<span>{range.name}</span>) ).join("/")
                }</article>
                    <article><b>Target:</b>{
                    spell.targets.map( range => (<span>{range.name}</span>) ).join("/")
                }</article>
                </main>
                <footer></footer>
            </div>
        default:
            return (<><span>{spell.name}</span>({spell.level}{spell.requisites.length > 0 && <span>-{
                spell.requisites.map(
                    (requisite, index) => (<Suspense key={index} fallback={"Loading"}>
                        <SpellRequisiteComponent requisite={requisite.requisite} art={requisite.art} value={requisite.value} mode={props.mode}/></Suspense>
                        )
                    ).join("")}</span>
                }, R: {
                    spell.ranges.map( range => (<span>{range.name}</span>) ).join("/")
                }, D: {
                    spell.durations.map( range => (<span>{range.name}</span>) ).join("/")
                }, T: {
                    spell.targets.map( range => (<span>{range.name}</span>) ).join("/")
                })</>);
    }

    return (<div></div>)
}
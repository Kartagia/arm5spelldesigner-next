import { GUID } from '@/data/guid';
import { ArtKey, RDT, RDTInfo, Spell, SpellPojo, SpellRequisite } from '@/data/spells';
import React, { PropsWithChildren, ReactElement, Suspense } from 'react';
import { ArtComponent, ArtPojo } from './Art';
import Art from '@/data/arts';

interface SpellViewProps {
    mode: "row"|"card"|""
}

function isGUID(value: any) {
    if (value instanceof GUID) {
        return true;
    }
    return typeof value === "string" && /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(value);
}

function checkGUID(value: any, options: {message?: string, lenient?: boolean} = {}): GUID {
    return value instanceof GUID ? value : GUID.fromString(value, options);
}


function createArt(name: string, type: string, abbrev: string|undefined = undefined): ArtPojo {
    const art = new Art(name, type, abbrev, 2, GUID.createV4());
    return art;
}

const techniques : Array<ArtPojo> = ["Creo", "Intellego", "Muto", "Perdo", "Rego"].map( (artName, index) => ( 
    createArt(artName, "Technique")));

const forms : Array<ArtPojo> = ["Animal", "Aquam", "Auram", "Corpus", "Herbam", "Ignem", "Imaginem", "Mentem", "Terram", "Vim"].map(
    (artName, index) => (
        createArt(artName, "Form")
    )
);

/**
 * The mapping from GUID to art name.
 */
const arts : Map<string, Art>= new Map([
    ...techniques.map( art => ([art.guid?.toString(), art])), 
    ...forms.map( art => ([art.guid?.toString(), art]))
] as [string, Art][]);

function fetchArt(guid: GUID):Promise<Art> {
    const result = arts.get(guid.toString());
    if (result !== undefined) {
        return Promise.resolve(result);
    } else {
        return Promise.reject();
    }
}

interface RDTComponentProps {
    rdt: RDT|RDTInfo|Array<RDT|RDTInfo>
}

/**
 * Create a RDT component.
 * @param props The properties of the component.
 */
export async function RDTComponent(props: RDTComponentProps & SpellViewProps): Promise<ReactElement> {
    return new Promise( (resolve, reject) => {
        switch (props.mode) {
            default:
                resolve(<>{(Array.isArray(props.rdt)?props.rdt:[props.rdt]).map( rdt => (<span key={rdt.name} className="rdt">{
                        rdt.name
                    }</span>
                ))}</>)
        }
    });
}

/**
 * Component viewing a spell requisites.
 * @param props The properites of the spell requisites.
 * @returns The promise of the component as the rendering might require asynchronous wait.
 */
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

export async function ArtReference({ref}: {ref: GUID|ArtKey|Art}): Promise<Art> {

    return new Promise( (resolve, reject) => {
        if (isGUID(ref)) {

        } else if (ref instanceof ArtKey) {
            const result = arts.values().find( art => (art.abbrev.toString() === ref.toString()));
            if (result) {
                resolve(result);
            } else {
                reject();
            }
        } else {
            const result = arts.values().find( art => (art.name === (ref as Art).name));
            if (result) {
                resolve(result);
            } else {
                reject();
            }
        }
    });
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
                    const art : Art|undefined = [...arts.entries()].find( ([_, value]) => (
                        value.abbrev.toString() === spell.technique?.toString()))?.[1];
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
                }</td>
                <td><RDTComponent rdt={spell.ranges} mode={props.mode}/></td>
                <td><RDTComponent rdt={spell.durations} mode={props.mode}/></td>
                <td><RDTComponent rdt={spell.targets} mode={props.mode}/></td>
                </tr>)
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
                    <article><b>Range:</b><RDTComponent rdt={spell.ranges} mode={props.mode}/></article>
                    <article><b>Duration:</b><RDTComponent rdt={spell.durations} mode={props.mode}/></article>
                    <article><b>Target:</b><RDTComponent rdt={spell.targets} mode={props.mode}/></article>
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
                },
                R: <RDTComponent rdt={spell.ranges} mode={props.mode}/>,
                D: <RDTComponent rdt={spell.durations} mode={props.mode}/>,
                T: <RDTComponent rdt={spell.targets} mode={props.mode}/>
                )</>);
    }

    return (<div></div>)
}
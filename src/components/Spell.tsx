import { GUID } from '@/data/guid';
import { ArtKey, Spell, SpellPojo, SpellRequisite } from '@/data/spells';
import React, { PropsWithChildren, ReactElement, Suspense } from 'react';
import { promiseHooks } from 'v8';

interface SpellViewProps {
    mode: "row"|"card"
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

interface Art {
    guid: GUID,
    name: string,
    abbrev: string,
    type: "Technique"|"Form"
}

function createArt(guid: GUID, name: string, type: "Technique"|"Form", abbrev: string|undefined = undefined): Art {

    return {
        guid, 
        name,
        type,
        get abbrev() {
            return abbrev ? abbrev : this.name.substring(0,2)
        }
    };
}

const techniques : Array<Art> = ["Creo", "Intellego", "Muto", "Perdo", "Rego"].map( (artName, index) => ( 
    createArt((new GUID(BigInt(index))), artName, "Technique")));

const forms : Array<Art> = ["Animal", "Aquam", "Auram", "Corpus", "Herbam", "Ignem", "Imaginem", "Mentem", "Terram", "Vim"].map(
    (artName, index) => (
        createArt((new GUID(BigInt(index + techniques.length))), artName, "Form")
    )
);

/**
 * The mapping from GUID to art name.
 */
const arts : Map<string, Art>= new Map([
    ...techniques.map( art => ([art.guid.toString(), art])), 
    ...forms.map( art => ([art.guid.toString(), art]))
] as [string, Art][]);

function fetchArt(guid: GUID):Promise<Art> {
    const result = arts.get(guid.toString());
    if (result !== undefined) {
        return Promise.resolve(result);
    } else {
        return Promise.reject();
    }
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
                            return (<span>{art.abbrev}</span>)
                        }
                    )
                } else {
                    resolve(<span>props.art.toString()</span>)
                }
            });
    }
}

export default async function SpellComponent(props: PropsWithChildren<SpellPojo & SpellViewProps>): Promise<ReactElement> {

    const requisites : SpellRequisite[] = await Promise.all((props.requisites.map( async req => (isGUID(req.art)?{...req, 
        art: new ArtKey((await fetchArt(checkGUID(req))).abbrev)}:{...req}))));
    const spell = {
        requisites,
        name: props.name,
        level: props.level,
        ranges: props.ranges
    };

    switch (props.mode) {
        case "row":
            return (<tr><td>{spell.name}</td><td>{spell.level}</td><td>{
                spell.requisites.map(
                    (requisite, index) => (<Suspense key={index} fallback={"Loading"}>
                    <SpellRequisiteComponent requisite={requisite.requisite} art={requisite.art} value={requisite.value} mode={props.mode}/></Suspense>
                    )
                ).join("")
                }</td><td>{
                    spell.ranges.map( range => (<span>{range.name}</span>) ).join("/")
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
                })</>);
    }

    return (<div></div>)
}

import { ArtKey, RDTInfo, SpellRequisite } from "@/data/spells";
import Spell from "../../components/Spell";
import { ReactElement } from "react";

export default function Spells() {

    const spells : Array<ReactElement> = [
        (<Spell key={`Demons eternal oblivion(Generic)`} 
            technique={new ArtKey("Pe")} form={new ArtKey("Vi")}
            name="Demons eternal oblivion" level="Generic" requisites={[] as SpellRequisite[]}
        ranges={
            [
                {
                    name: "Voice",
                    modifier: 2,
                    secondaryRDTs: []
                } as RDTInfo 
            ]
        }
        durations={
            [
                {
                    name: "Momentary",
                    modifier: 0,
                    secondaryRDTs: []
                } as RDTInfo 
            ]
        }
        targets={
            [
                {
                    name: "Individual",
                    modifier: 0,
                    secondaryRDTs: []
                } as RDTInfo 
            ]
        }
        isGeneric={true}
        
        mode={"card"}
        />),
        (<Spell key={`Cloak of Ducks Feathers`} name="Cloak of Ducks Feathers" level={4} 
            technique={new ArtKey("Re")} form={new ArtKey("Aq")}
            requisites={[
                {
                    requisite: "required",
                    value: 0,
                    art: new ArtKey("An")
                }
            ] as SpellRequisite[]}
        ranges={
            [
                {
                    name: "Voice",
                    modifier: 2,
                    secondaryRDTs: []
                } as RDTInfo 
            ]
        }
        durations={
            [
                {
                    name: "Momentary",
                    modifier: 0,
                    secondaryRDTs: []
                } as RDTInfo 
            ]
        }
        targets={
            [
                {
                    name: "Individual",
                    modifier: 0,
                    secondaryRDTs: []
                } as RDTInfo 
            ]
        }
        isGeneric={true}
        
        mode={"card"}
        />)
         
    ];

    return (<div>
        <h1>Spells</h1>
        {spells}
    </div>)
}
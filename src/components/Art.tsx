import Art from "@/data/arts";
import { GUID } from "@/data/guid";
import { ArtKey } from "@/data/spells";

interface ArtViewOptions {

    mode: "row"|"card"|""
}

export interface ArtPojo {
    guid?: GUID;
    name: string,
    abbrev: ArtKey,
    type: string,
    style: string
}

export function ArtComponent(props: ArtPojo & ArtViewOptions) {

    switch (props.mode) {
        case "card":
            return (<article><b>Art:</b>{props.name.toString()}</article>)
        case "row":
        default:
            return (<span>{props.abbrev.toString()}</span>)
    }
}
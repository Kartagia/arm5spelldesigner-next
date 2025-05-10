"use client";
import React, { ReactNode } from "react";

/**
 * A single contact information entry.
 */

export interface ContactInformation {
    name: string;
    title: ReactNode;
    action?: ReactNode;
    address: string;
}
/**
 * The contact information data structure.
 */

export type ContactInformations = Record<string, ContactInformation>;
/**
 * Contact list is a component producing a contact list.
 * @param props The properties of the created contact list.
 * @returns The ReactNode containing the contact list.
 */

export function ContactList(props: { info: ContactInformations; style?: string; className?: string; }) {

    switch (props.style ?? "") {
        case "list":
            return (<ul className={props.className ?? "contacts"}>{Object.getOwnPropertyNames(props.info).map(
                (category) => (<li key={category}>{props.info[category].action ?? props.info[category].title}</li>)
            )}</ul>);
        default:
            return (<span className={props.className ?? "contacts"}>{Object.getOwnPropertyNames(props.info).map(
                (category) => (<span key={category}>{props.info[category].action ?? props.info[category].title}</span>)
            )}</span>);

    }
}

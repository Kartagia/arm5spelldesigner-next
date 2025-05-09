"use client";
import { ContactInformations, ContactList } from "@/components/gdpr/ContactInformations";
import React, { ReactNode } from "react";

/**
 * The type of the rights structure.
 */

export type Rights = Record<string, ReactNode>;
/**
 * Generate rights.
 * @param org The organization name.
 * @param contactInfo The organization contract information.
 * @returns The default rigths record for the organization with contact information.
 */
export function generateRigths(org: string, contactInfo: ContactInformations): Record<string, ReactNode> {
    const result = {
        access: (<>You have right to request {org} for copies of your personal data. We may charge a small fee for this ServiceWorker.</>),
        rectification: (<>You have the right to request that {org} correct any information you believe is inaccurate.
            You also have right to request {org} to complete information you believe incomplete.</>),
        erasure: (<>You have the right to request that {org} erase your personal data, under certain conditions. This will cause removal of your account, and unlinking
            any public information from you.</>),
        ["restric processing"]: (<>You have the right to request that {org} restrict the processing your personal data, under certain conditions.</>),
        ["object to processing"]: (<>You have the right to object {org}'s processing of your personal data, under certain conditions.</>),
        ["data portability"]: (<>You have right to request that {org} transfer the data that we have collected to antoher organization, or directly
            to you, under certain conditions.</>),
        ["footer"]: (<>If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us:
            <ContactList info={contactInfo} /></>)
    };

    return result;
}
export function createRigths(content: ReactNode, right?: string): ReactNode {
    if (right) {
        return (<><span className={"right-title"}>The right to {right} - </span>{content}</>);
    } else {
        return (<><span className={"right-title"}>The your right - </span>{content}</>);
    }
}

export interface RigthsComponentProps {
    /**
     * The rights shown.
     */
    rights: Rights;

    /**
     * The class name of the rights component.
     * @default "rights"
     */
    className?: string;

    titleClassName?: string;

    descClassName?: string;
}

export function RightsComponent(props: RigthsComponentProps) {
    return <dl className={props.className ?? "rights"}>
        {
            Object.getOwnPropertyNames(props.rights).map( (right) => {


                return (<><dt className={props.titleClassName ?? "rights-title"} key={right}>The right to {right}</dt><dd className={
                    props.descClassName ?? "rights-content"}>{props.rights[right]}</dd></>)
            })
        }
    </dl>
}
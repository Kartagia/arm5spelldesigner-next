'use client';
import Image from "next/image";
import { ReactElement, MouseEventHandler, MouseEvent } from "react";
import { Icon } from "next/dist/lib/metadata/types/metadata-types";

/**
 * The control component handling carousel change.
 * @param props The properties of the carousel contorl.
 * @returns The react element of the carousel control.
 */

export function CarouselControl(props: CarouselControlProps): ReactElement {
    const classNames = (props.className === undefined || props.className === "" ? ["carouselControl"] :
        Array.isArray(props.className) ? props.className : [props.className]);

    /**
     * Handle the clicking of the carousel control.
     * @param event The event triggered by the div element child.
     */
    const handleClick: MouseEventHandler<HTMLDivElement> = (event: MouseEvent<HTMLDivElement>) => {
        if (props.onClick) {
            props.onClick(event);
        } else {
            event.preventDefault();
        }
    };

    return (<div className={[...classNames, ...(
        props.disabled ? ["disabled"] : []
    )].join(" ")} aria-label={props["aria-label"]} onClick={handleClick}>{typeof props.icon === "string" ? props.icon : <Image src={props.icon.toString()} alt={(props["aria-label"] || "")} />}</div>);
}

/**
 * The carousel control properties.
 */
export interface CarouselControlProps {

    /**
     * Is the control disabled.
     * @default false
     */
    disabled?: boolean;

    /**
     * Is the control visible.
     * @default true
     */
    visible?: boolean;


    /**
     * The class names of the component bestowed from parent.
     */
    className: string | Array<string>;

    /**
     * The aria label of the control.
     */
    ["aria-label"]?: string;

    /**
     * The handler of the click on the event.
     */
    onClick?: MouseEventHandler<HTMLDivElement>;

    /**
     * The icon of the carousel control.
     */
    icon: string | Icon;
}


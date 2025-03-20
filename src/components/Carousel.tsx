'use client'
import { ReactElement, useState } from "react";
import { CarouselControl } from "./CarouselControl";
import styles from './Carousel.module.css';


/**
 * Carousel component.
 */
export default function Carousel<TYPE>(props: CarouselProps<TYPE>): ReactElement {
    const values = props.values || [];
    const index = (props.value === undefined ? props.defaultValue === undefined ? -1 : props.defaultValue : props.value);
    const itemCount = values.length;
    const disabledPrev = !props.roll && index <= 0;
    const disabledNext = !props.roll && index >= itemCount -1;

    const handlePrev = (item: TYPE|undefined, index : number) => {
        if (props.onChange && !disabledPrev) {
            console.log(`Handling change to prev`)
            props.onChange(index);
            return false;
        } else {
            console.log(`Component read-only`)
            return true;
        }
    }

    const handleNext = (item: TYPE|undefined, index : number) => {
        if (props.onChange && !disabledNext) {
            console.log(`Handling change to next`)
            props.onChange(index);
            return false;
        } else {
            console.log(`Component read-only`)
            return true;
        }
    }

    console.table({index, itemCount, disabledPrev, disabledNext});

    return (<div className={styles.carousel}>
        <CarouselControl className={styles.prev} icon="<" disabled={disabledPrev} onClick={ (e) => {handlePrev(values[index], index-1) } } />
        <div className={styles.items}>{props.children.filter( (_child, i) => (i === index))}</div>
        <CarouselControl className={styles.next} icon=">" disabled={disabledNext} onClick={ (e) => { handleNext(values[index], index+1)}} />
    </div>)
}



export interface CarouselProps<TYPE> {
    /**
 * The children of the carousel giving the choices of the carousel.
 */
    children: ReactElement[];

    /**
     * The default value index.
     */
    defaultValue?: number;

    /**
     * The current value index.
     */
    value?: number;

    /**
     * Does the carousel roll around.
     * @default false
     */
    roll?: boolean;

    /**
     * The values of the carousel items.
     */
    values?: (TYPE | undefined)[];

    /**
     * The listener reacting to change of the carousel value.
     * @param itemIndex The new item index.
     */
    onChange?: (itemIndex: number) => void;

    /**
     * The selection listener reacting to selection of a value.
     * @param item The selected item.
     * @param index The index of the selected item.
     */
    onSelect?: (item: TYPE | undefined, index: number) => void;

    /**
     * The selected value.
     * If the selected is an array, the multiple selections are allowed.
     */
    selected?: TYPE[] | TYPE | undefined;
}

"use client";

/**
 * The error list properties.
 */
export interface ErrorListProps {
    /**
     * Mapping from error category to list of error messages.
     */
    errors: Record<string, string[]>;

    /**
     * The key of the shown error category.
     */
    errorKey?: string;

    /**
     * The class list of the error list excluding automatic "error" class.
     */
    className?: string;

    /**
     * Is the component inline. An inline component is not surrounded with a section.
     */
    inline?: boolean;
}

function emptyErrorRecord(errors: Record<string, string[]>): boolean {
    const keys = Object.getOwnPropertyNames(errors);
    return keys.every( key => (errors[key].length === 0) );
}

/**
 * Error list component shows errors.
 * @param props The properties of the error list.
 * @returns An empty error fragment, if error list contains no errors of the class. 
 * Otherwise the react node showing the error list.
 */
export function ErrorList(props: ErrorListProps) {
    if ( (props.errorKey && (props.errors[props.errorKey] ?? []).length === 0) || emptyErrorRecord(props.errors) ) {
        return <></>;
    }

    if (props.inline) {
        return (<ul className={(props.className ? props.className + " " : "") + "error"}>
        {(props.errorKey ? (props.errorKey in props.errors ? [props.errorKey] : []) : Object.getOwnPropertyNames(props.errors)).flatMap(
            (key) => (props.errors[key].map((item) => (<li key={key + "." + item}>{item}</li>)))
        )}</ul>);
    } else {
        return (<div className={(props.className ? props.className + " " : "") + "error"}><ul>
        {(props.errorKey ? (props.errorKey in props.errors ? [props.errorKey] : []) : Object.getOwnPropertyNames(props.errors)).flatMap(
            (key) => (props.errors[key].map((item) => (<li key={key + "." + item}>{item}</li>))))}</ul></div>);

    }
}

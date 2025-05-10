import { ReactNode } from "react";


/**
 * The properties of the topic component.
 */
export interface TopicProps {
    title: ReactNode;
    className?: string;
    ingress?: ReactNode;
    items?: Record<string, ReactNode>;
    footer?: ReactNode;
}

/**
 * The topic component.
 * @param props The topic properties.
 * @returns The topic component.
 */
export function Topic(props: TopicProps): ReactNode {

    return (<div className={ (props.className ? [props.className, "topic"] : ["topic"]).join(" ")}>
        <header>{props.title}</header>
        <main>{props.ingress && props.ingress}{props.items && <ul>{Object.getOwnPropertyNames(props.items).map( 
            item => (<li key={item}>{props.items?.[item]}</li>))}</ul>}</main>
        { props.footer ? <footer>{props.footer}</footer> : ""}
    </div>)
}

import Carousel, { CarouselProps } from './Carousel';

/**
 * The action handling change of the shown carousel value.
 */
export type ChangeAction = { (context: string|undefined|null, index: number|undefined|null, formData: FormData ):Promise<void>}

/**
 * The action selecting a carousel value.
 */
export type SelectAction<TYPE> = { (value: TYPE, index: number|undefined, formData: FormData): Promise<void>}

/**
 * The action seelcting a carousel value with context.
 */
export type ContextSelectAction<TYPE> = {(context: string|undefined|null, value: TYPE, index: number|undefined, formData: FormData): Promise<void>}

/**
 * Properties of the Carousel components for NextJS.
 */
export interface NextCarouselProps<TYPE> {
    /**
     * The change action of the carousel component.
     */
    changeAction?: ChangeAction;

    /**
     * The context of the carousel.
     */
    context?: string;
}


export function NextCarousel<TYPE>(props: CarouselProps<TYPE> & NextCarouselProps<TYPE>) {
    const {children, context, changeAction, ...rest} = props;
    const { values = [], value = undefined, defaultValue = undefined } = rest;
    const itemCount = values.length;

    const handleChange = (index: number) =>  {
        if (changeAction) {
            const formData = new FormData();
            if (index >= 0 || index < itemCount) {
                try {
                    const valueRef = JSON.stringify(values[index]);
                    formData.append("current", valueRef);
                    formData.append("currentIndex", index.toString());
                    return changeAction(context, index, formData);
                    
                } catch(error) {
                    formData.append("currentIndex", index.toString());
                    return changeAction(context, index, formData);
                }
            }
            changeAction(context, index, formData);
        }
    }

    return (<Carousel {...rest} onChange={ (index) => {handleChange(index)}} >{children}</Carousel>);
}

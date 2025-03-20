

/**
 * A context. 
 */
export interface Context {
    /**
     * The index of the art.
     */
    artIndex?: number;
}

/**
 * The options for contexts.
 */
export interface ContextOptions {

    /**
     * The default context. 
     */
    defaultContext?: Context;

    /**
     * Does any set operation automatically create a new context.
     * Requires default context. 
     */
    autocreate?: boolean; 

    /**
     * Is the context lenient.
     * A lenient true implies: 
     * - defaultContext: {}
     * - autocreate: true
     */
    lenient?: boolean;
}

/**
 * The current contexts.
 */
var contexts = new Map<string, Context>();

/**
 * Set current art index.
 * @param context The context of the art index.
 * @param value The new index of the context. If undefined, the index is removed.
 */
export function setCurrentArtIndex(context: string, value: number|undefined, options : ContextOptions = {lenient: true} ) {
    const {lenient=true} = options;
    const {autocreate=lenient, defaultContext=(lenient?{}:undefined)} = options;
    if (!contexts.has(context)) {
        if (lenient) {
            contexts.set(context, {});
        } else if (autocreate) {
            if (defaultContext) {
                contexts.set(context, defaultContext);
            } else {
                throw new Error("Missing default context");
            }
        }
    } 
    const target = contexts.get(context);
    
    if (target)  {
        if (value === undefined) {
            delete(target.artIndex)
        } else {
            target.artIndex = value;
        }    
    }
}

/**
 * Get the current art index of the context.
 * @param context The context
 * @returns The current art index of the context.
 */
export function getCurrentArtIndex(context: string, options : ContextOptions = {lenient: true}): number|undefined {
    const target = contexts.get(context);
    return target ? target.artIndex : undefined;
}
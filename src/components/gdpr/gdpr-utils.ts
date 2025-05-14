import { ReactNode } from "react";


/**
 * The GDPR page.
 */

export interface DataCollectionInfo {
    /**
     * The reason of data collection.
     */
    reason: ReactNode;
    /**
     * How the data is collected.
     */
    how: ReactNode;
    /**
     * When the dta is collected, if the collection is limites on specific segments.
     */
    when?: string;

}/**
 * Filtering items mapping from records.
 * @param source The source record.
 * @param mapper THe mapper mapping source record values to react node lists. If mapper returns undefiend value, the
 * item is mapped to the key.
 * @param options The options of the mapping.
 * @returns
 */
export function filterItems<TYPE, keys extends string = string>(source: Record<keys, TYPE>, mapper: (item: TYPE, category?: keys) => ReactNode | undefined,
    options: {
        filter?: (key: keys) => boolean; removeDuplicates?: boolean;
    } = {}): Record<string, ReactNode> {
    const result: Record<string, ReactNode> = {};

    const reservedValues: ReactNode[] = [];
    for (const key in source) {
        if (!options.filter || options.filter(key)) {
            const content = mapper(source[key]);
            if (!reservedValues.includes(content)) {
                if (content) {
                    result[key] = content;
                    if (options.removeDuplicates) {
                        reservedValues.push(content);
                    }
                } else {
                    result[key] = key;
                    if (options.removeDuplicates) {
                        reservedValues.push(key);
                    }
                }
            }
        }
    }
    return result;
}


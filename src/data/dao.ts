
/**
 * Data access object defining module.
 */
/**
 * Data access object allowing asynchronous access to a data source.
 */
export interface Dao<CONTENT, ID = String, ERROR = any> {

    /**
     * Get all identifier-content pairs.
     * @returns The promise of the identifier pairs.
     */
    getAll(): Promise<[ID, CONTENT][]>;

    /**
     * Get the resource associated with a GUID.
     * @param id The identifier of the queried value.
     * @throws {ERROR} The rejected error indicating the resource was not available.
     */
    get(id: ID): Promise<CONTENT>;
}


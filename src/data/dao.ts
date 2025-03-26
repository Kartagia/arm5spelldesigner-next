import { Identified, EntryFilter, NotFoundError, UnsupportedError, createIdentified, Predicate, EntryPredicate } from "./utils";

/**
 * The data access object. 
 */
export interface Dao<TYPE, ID = string> {

    /**
     * Get all entries.
     * @returns The promise of all identified entries of the dao.
     */
    getAll(): Promise<Array<Identified<TYPE, ID>>>;

    /**
     * Get some elements of the dao.
     * @param filter The filter selecting the valid values.
     * @returns The promise of all identified entries of the dao with filter returning true. 
     */
    getSome(filter: EntryFilter<TYPE, ID>): Promise<Array<Identified<TYPE, ID>>>;

    /**
     * Get a value associated to an identifier.
     * @param id The identifier.
     * @returns The promise of the value associated to the identifier.
     * @throws {"Not Found"} The rejection value indicating there was no value associated with the identifier.
     */
    get(id: ID): Promise<TYPE>;

    /**
     * Create a new value. 
     * @param value The new value.
     * @returns The promise of the identifier associated to the value.
     * @throws {Error} The rejection value, if the value was not accepted.
     * @throws {UnsupportedError} The rejection value, if the operation is not supported.
     */
    create(value: TYPE): Promise<ID>;

    /**
     * Update an existing value.
     * @param id The identifier of the value.
     * @param value The new value associated to the value.
     * @returns The promise whether the value was changed.
     * @throws {Error} The rejection value indicationg the value was invalid. 
     * @throws {"Not Found"} The rejection value indicating identifier does not exist in DAO.
     * @throws {UnsupportedError} The rejection value, if the operation is not supported.
     */
    update(id: ID, value: TYPE): Promise<boolean>;

    /**
     * Remove a value associated to an identifier from DAO.
     * @param id The removed identifier.
     * @returns The promise whether the value was removed or not.
     * @throws {UnsupportedError} The rejection value, if the operation is not supported.
     */
    delete(id: ID): Promise<boolean>;
}

/**
 * The validator validating all values.
 * @param id The identifier of the value.
 * @param value The teted value.
 * @returns The promise validating all values.
 */
export function TrueValidator<TYPE, ID>(id: ID | undefined, value: TYPE) {
    return Promise.resolve(true);
}

/**
 * The interface containing all DAO listeners. 
 */
export interface DaoListeners<TYPE, ID> {

    /**
     * The event listener of a creation of a new value.
     * @param id The identifier associated with the created value.
     * @param newValue The new value added to the dao.
     * @returns No return value.
     */
    onCreate?: (id: ID, newValue: TYPE) => void;

    /**
     * The event listener of an update of a value.
     * @param id The idetnifier of hte altered value.
     * @param newValue The new value.
     * @param oldValue The old value replaced by the new value.
     * @returns No return value.
     */
    onUpdate?: (id: ID, newValue: TYPE, oldValue: TYPE) => void;

    /**
     * The event listener of a deletion.
     * @param id The removed identifier.
     * @returns No return value.
     */
    onDelete?: (id: ID) => void;
}


/**
 * The Array DAO parameters.
 */
export type ArrayDaoParam<TYPE, ID> = {
    /**
     * The iterable producing the initial entries of the dao.
     */
    entries: Iterable<Identified<TYPE, ID>>,
    /**
     * The function generating identifier for a value.
     * @param value The value, whose identifier is generated.
     * @returns The promise of the identifier.
     * @default Promise.reject() Promise rejecting all values. 
     */
    createId?: (value: TYPE) => Promise<ID>,
    /**
     * Is the DAO read only.
     * @default false
     */
    readOnly?: boolean;

    /**
     * Is the value valid value for array predicate.
     */
    validValue?: (id: ID|undefined, value: TYPE) => Promise<boolean>;
}

/**
 * BasicDao is a basic DAO implementation. 
 * 
 * The method getAll will default to a method returning an empty array.
 * 
 * The method getSome will default to a method filtering results from getAll results.
 * 
 * The method get will default to a method filtering the result from getAll.
 * 
 * Other methods default to an unsupported method.
 * 
 */
export class BasicDao<TYPE, ID = string> implements Dao<TYPE, ID> {

    private rep: Partial<Dao<TYPE, ID>>;
    private onCreate: (id: ID, newValue: TYPE) => void;
    private onUpdate: (id: ID, newValue: TYPE, oldValue: TYPE) => void;
    private onDelete: (id: ID) => void;

    constructor(params: Partial<Dao<TYPE, ID>> & DaoListeners<TYPE, ID>) {
        this.rep = params;
        this.onCreate = params.onCreate || (() => { });
        this.onUpdate = params.onUpdate || (() => { });
        this.onDelete = params.onDelete || (() => { });
    }

    getAll() {
        if (this.rep.getAll) {
            return this.rep.getAll();
        } else {
            return Promise.resolve([]);
        }
    }

    getSome(filter: (id: ID, value: TYPE) => boolean) {
        if (this.rep.getSome) {
            return this.rep.getSome(filter);
        } else {
            return this.getAll().then(all => (all.filter(entry => (filter(entry.id, entry.value)))));
        }
    }

    get(id: ID) {
        if (this.rep.get) {
            return this.rep.get(id);
        } else {
            return this.getSome((current, _value) => (current === id)).then(
                (entries) => {
                    if (entries.length === 1) {
                        return entries[0].value;
                    } else {
                        throw NotFoundError;
                    }
                }
            )
        }
    }

    create(value: TYPE) {
        if (this.rep.create) {
            return this.rep.create(value).then(
                (id) => {
                    this.onCreate(id, value);
                    return id;
                }
            );
        } else {
            return Promise.reject(new UnsupportedError({ message: "Creating new values not supported" }));
        }
    }

    update(id: ID, value: TYPE) {
        if (this.rep.update && this.rep.get) {
            return this.rep.get(id).then(
                oldValue => {
                    return this.rep.update && this.rep.update(id, value).then(
                        (success) => {
                            if (success) {
                                this.onUpdate(id, value, oldValue);
                            }
                            return success;
                        }
                    ).then(
                        result => {
                            return result;
                        },
                        error => {
                            throw error;
                        }
                    ) || false;
                });
        }
        return Promise.reject(new UnsupportedError({ message: "Updating values not supported" }));
    }

    delete(id: ID) {
        if (this.rep.delete) {
            return this.rep.delete(id).then(
                (success) => {
                    if (success) {
                        this.onDelete(id);
                    }
                    return success;
                }
            );
        } else {
            return Promise.reject(new UnsupportedError({ message: "Deleting values not supported" }));
        }
    }
}

/**
 * The array DAO implementation. 
 * 
 * The array day implementation is a in memory DAO using array to store
 * the DAO entries. 
 */
export class ArrayDao<TYPE, ID = string> extends BasicDao<TYPE, ID> {

    private entries: Identified<TYPE, ID>[];

    constructor(params: ArrayDaoParam<TYPE, ID> & DaoListeners<TYPE, ID>) {
        const { entries, createId = undefined, validValue = TrueValidator, readOnly = false } = params;
        super({
            onCreate: params.onCreate,
            onDelete: params.onDelete,
            onUpdate: params.onUpdate,
            getAll: () => {
                return Promise.resolve([...(this.entries || [])]);
            },
            create: (value: TYPE) => {
                if (createId) {
                    return validValue(undefined, value).then(
                        (valid) => {
                            if (valid) {
                                return createId(value).then((id) => {
                                    this.entries?.push(createIdentified(id, value));
                                    return id;
                                })
                            } else {
                                throw new Error("Invalid value");
                            }
                        })
                } else {
                    return Promise.reject(new Error("Adding new values not supported"));
                }
            },
            update: (id: ID, value: TYPE) => {
                if (readOnly) {
                    return Promise.reject(new Error("Updating values not supported"));
                }
                if (this.entries?.find(entry => (entry.id === id))) {
                    return validValue(id, value).then(
                        valid => {
                            if (valid) {
                                const index = this.entries?.findIndex(entry => (entry.id === id));
                                if (index !== undefined) {
                                    this.entries?.splice(index, 1, createIdentified(id, value));
                                    return true;
                                } else {
                                    throw "Not Found";
                                }
                            } else {
                                throw new Error("Invalid value");
                            }
                        }
                    )
                } else {
                    return Promise.reject("Not Found");
                }
            },
            delete: (id: ID) => {
                const index = this.entries?.findIndex(entry => (entry.id === id));
                if (index !== undefined && index >= 0) {
                    this.entries?.splice(index, 1);
                    return Promise.resolve(true);
                } else {
                    return Promise.resolve(false);
                }
            }
        });
        this.entries = [...(entries || [])];
    }
}
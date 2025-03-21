import { Dao } from "./dao";
import { GUID } from "./guid";
import { RDT, RDTInfo } from "./spells";

/**
 * The RDT cache for in memory stored RDT information.
 */
const rdtCache = new Map<string, RDTInfo>();

/**
 * A RDT with guid set.
 */
export type IdentifiedRDT = Required<Pick<RDT, "guid">> & Omit<RDT, "guid">;

/**
 * A RDTInfo with guid set.
 */
export type IdentifiedRDTInfo = Required<Pick<RDTInfo, "guid">> & Omit<RDTInfo, "guid">;


/**
 * Get rdt information.
 * @param id The GUID of the RDT.
 * @returns The promise of the RDT informaiton with given identifier.
 */
export function getRDTInfo(id: GUID): Promise<RDTInfo> {
    const result = rdtCache.get(id.toString());
    if (result) {
        return Promise.resolve(result);
    } else {
        return Promise.reject(new Error("Not found"));
    }
}

/**
 * Fetch RDT informaiton to the cache from data source.
 * @param dataSource The data source. 
 * @param rdts The rdts whose details are fetched from the data source to the cache.
 */
export function fetchRDTInfo(
    dataSource: Dao<RDT>,
    rdts: (RDT | RDTInfo | GUID)[],
    idCache: WeakMap<RDT | RDTInfo, Promise<GUID>> = new WeakMap()
): Promise<boolean> {

    return new Promise((resolve, reject) => {
        Promise.all(rdts.map(rdtOrGuid => {
            if (rdtOrGuid instanceof GUID) {
                dataSource.get(rdtOrGuid.toString());
                return true;
            } else if (rdtOrGuid.guid) {

            } else {
                var id = idCache.get(rdtOrGuid);
                if (id) {
                    // The value is in waiting and the waiting will store the value to the data source.
                } else {
                    id = createRDT(rdtOrGuid, idCache).then(rdt => (dataSource.create(rdt))).then(
                        (created) => (GUID.fromString(created, {}))
                    );
                    idCache.set(rdtOrGuid, id);
                }
            }
        })).then(
            results => {
                resolve(true);
            },
            reject => {
                resolve(false);
            }
        );
    });
}

/**
 * Create RDT from rdt or rdt information.
 * 
 * The process ensures the GUIDs assigned to the RDT infos and RDTs without GUID are valid GUIDs.
 * 
 * @param rdt The source rdt.
 * @param idCache The identifier cache for storing rdts and rdtinfos waiting for GUID.
 * @returns The promise of the created RDT with all secondary RDTs replaced with appropriate GUID.
 */
function createRDT(
    rdt: RDT | RDTInfo,
    idCache: WeakMap<RDT | RDTInfo, Promise<GUID>> = new Map(),
    usedCache: Map<string, RDTInfo> = rdtCache): Promise<IdentifiedRDT> {
    if (rdt.guid !== undefined && rdt.secondaryRDTs.every((value) => (value instanceof GUID))) {
        return Promise.resolve(rdt as IdentifiedRDT);
    } else {
        return new Promise((resolve, reject) => {
            Promise.all(rdt.secondaryRDTs.map((rdt) => {
                if (rdt instanceof GUID) {
                    return Promise.resolve(rdt);
                } else if (rdt.guid) {
                    return Promise.resolve(rdt.guid);
                } else {
                    var id = idCache.get(rdt);
                    if (id) {
                        // Using the cached GUID.
                        return id;
                    } else {
                        // Generating new GUID.
                        /**
                         * @todo Replace with fetching from DAO supporting fetching GUIDs.
                         */
                        id = Promise.resolve(GUID.createV4()).then(
                            (createdId) => {
                                usedCache.set(createdId.toString(), rdt as RDTInfo);
                                return createdId;
                            }
                        );
                        idCache.set(rdt, id);
                        return id;
                    }
                }
            })
            ).then(
                secondaryRDTs => {
                    /**
                     * @todo Replace with fetching from DAO supporting fetching GUIDs.
                     */
                    const guid = rdt.guid ?? GUID.createV4();
                    resolve({
                        ...rdt,
                        guid,
                        secondaryRDTs
                    });
                },
                reject
            )
        });
    }
}

export function storeRDTInfo(dataSource: Dao<RDT>): Promise<boolean> {
    const idCache = new WeakMap<RDT | RDTInfo, Promise<GUID>>();
    return new Promise((resolve, reject) => {
        [...rdtCache.entries()].forEach(([id, rdt], index, cache) => {
            Promise.all(rdt.secondaryRDTs.map(rdt => (rdt.guid ? Promise.resolve(rdt.guid) :
                createRDT(rdt, idCache).then(value => (value.guid as GUID))))).then(
                    secondaryRdts => {
                        return dataSource.update(id, { ...rdt, secondaryRDTs: secondaryRdts }).then(

                        )
                    })
        });
    });

}

/**
 * Set the RDT information.
 * @param rdt The added RDT.
 * @param id The identifer assigned to the RDT. Defaults to the rdt GUID, and if no RDT
 * guid exists, a newly generated RDT.
 * @returns The promise whether the operation succeeded or not.
 */
export function setRDTInfo(rdt: RDT | RDTInfo, id: GUID | undefined = undefined): Promise<boolean> {
    const guid = id ? id : rdt.guid ?? GUID.createV4();
    if (rdt.secondaryRDTs.some(rdtValue => (rdtValue instanceof GUID))) {
        // We do have RDT and we must fetch the RDTs of the guids.
        return Promise.all(rdt.secondaryRDTs.map((seeked) => (seeked instanceof GUID ? getRDTInfo(seeked) : Promise.resolve(seeked)))
        ).then(
            values => {
                rdtCache.set(guid.toString(), {
                    ...rdt,
                    secondaryRDTs: values
                })
                return true;
            },
            error => {
                return false;
            }
        )
    } else {
        // We do have RDT Info.
    }
    return new Promise((resolve, reject) => {

    });
}

/**
 * Equivalence of the RDTs.
 * @param compared The compared value.
 * @param comparee The value compared to.
 * @returns True, if an donly if the compared and comparee are equivalent RDTs.
 */
export function equalRDT(compared: RDTInfo | RDT, comparee: RDTInfo | RDT): boolean {
    if (compared.guid && comparee.guid) {
        return compared.guid.value === comparee.guid.value;
    }
    return compared.name == comparee.name && compared.modifier == comparee.modifier;
}

/**
 * Comparison order of the RDTs.
 * @param compared The compared value.
 * @param comparee The value compared to.
 * @returns The comparison result.
 */
export function compareRDT(compared: RDTInfo, comparee: RDTInfo): number {
    const comparedKey = compared.modifier;
    const compareeKey = comparee.modifier;
    if (Number.isNaN(comparedKey) || Number.isNaN(compareeKey)) {
        return Number.NaN;
    } else if (comparedKey == compareeKey) {
        // Comparing names as the values are equals.
        return compared.name.localeCompare(comparee.name);
    } else {
        return comparedKey < compareeKey ? -1 : 1;
    }
}

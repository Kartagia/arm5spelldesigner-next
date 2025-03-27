import { promised } from "../lib/utils";
import { ArtDao, HermeticArtDao } from "./artDao";
import Art from "./arts";
import { GUID } from "./guid";
import { ArtKey } from "./spells";
import { NotFoundError } from "@/lib/exception";
import { EntryFilter, Identified } from '@/lib/utils';

/**
 * The data source.
 */
var artDao: ArtDao = new HermeticArtDao();

/**
 * Set the current data source.
 * @param dataSource The new data source.
 */
export function setDataSource(dataSource: ArtDao) {
    artDao = dataSource;
}

/**
 * Get the art. 
 * @param art The sougth art GUID, art key (abbreviation), or art name (string).
 * @returns The art, if the used data access source contains the art. If the art is not
 * found, returns undefined value.
 */
export function getArt(art: GUID|ArtKey|string): Art|undefined {
    return promised(fetchArt(art), {lenient: true});
}

/**
 * Get the promise of an art.
 * @param art The sougth art GUID, art key (abbreviation), or art name (string).
 * @returns The promise of the art. The promise fulfils, if the art is found. The promise
 * rejects with error, if the art does not exist.
 * @throws {NotFoundError} The rejection error, if the art was not found.
 */
export function fetchArt(art: GUID|ArtKey|string): Promise<Art> {
    if (art instanceof GUID) {
        return artDao.get(art.toString());
    } else if (art instanceof ArtKey) {
        return artDao.getByKey(art);
    } else {
        return artDao.getByName(art);
    }
}

/**
 * Get arts.
 * @param filter The optional filter for filtering arts.
 * @returns The promise of arts passing the filter.
 */
export function fetchArts(filter: EntryFilter<Art> = () => true): Promise<Identified<Art>[]> {
    return artDao.getSome(filter);
}

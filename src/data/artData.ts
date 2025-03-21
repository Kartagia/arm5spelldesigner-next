import { promised } from "../../lib/utils";
import { HermeticArtDao } from "./artDao";
import Art from "./arts";
import { GUID } from "./guid";
import { ArtKey } from "./spells";


var artDao = new HermeticArtDao();

export function getArt(art: GUID|ArtKey|string): Art|undefined {
    return promised(fetchArt(art), {lenient: true});
}

export function fetchArt(art: GUID|ArtKey|string): Promise<Art> {
    if (art instanceof GUID) {
        return artDao.get(art.toString());
    } else if (art instanceof ArtKey) {
        return artDao.getByKey(art);
    } else {
        return artDao.getByName(art);
    }
}
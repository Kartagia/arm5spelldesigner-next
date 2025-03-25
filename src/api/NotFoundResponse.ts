import {ErrorResponse} from './ErrorResponse';

export class NotFoundError extends ErrorResponse {

    private myGuid : string;

    constructor({guid, message = "Resource not found", errorCode = "404"}
        : (ErrorResponse & {guid: string})
    ) {
        super({message, errorCode});
        this.myGuid = guid;
    }

    get guid() {
        return this.myGuid;
    }

    toJSON() {
        return JSON.stringify({message: this.message, errorCode: this.errorCode, guid: this.guid});
    }
}
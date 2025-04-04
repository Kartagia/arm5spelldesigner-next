
/**
 * Users module for handling users. 
 * @module users
 */

export interface UserInfo {

    /**
     * The email address o fthe user.
     */
    email: string;

    /**
     * The display name of the user.
     * @default this#email The email address of the user.
     */
    displayName?: string;

    /**
     * The global user identifier. 
     */
    guid: string;
}

/**
 * The credentials of the user.
 */
export interface Credentials {

}


export async function createUser(details: Omit<UserInfo, "guid">) {
    
}


/**
 * The authentication module.
 */

export const EmailField = "email";

export const PasswordField = "password";


/**
 * Validate an email address.
 * @param value The tested value.
 * @returns True, if and only if the email is a valid email address.
 */
export function validEmail(value: string): boolean {

    return /^(?:[\w-]+\.)*(?:[\w-]+)@(?:\w+\.)*(?:\.\w{2,})$/.test(value);
}

/**
 * Test validity of a password.
 * @param value The tested value.
 * @returns True, if and only if the email is a valid password.
 */
export function validPassword(value: string): boolean {
    return value.trim().length >= 14;
}
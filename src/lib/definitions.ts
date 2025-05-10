

/**
 * The module containing definitions other modules use.
 * @module definitions
 */

import { z } from "zod";

/**
 * The interface containing API session information.
 */
export interface ApiSessionInfo {
    /**
     * The API session header update details.
     */
    headerKey: {
        name: string;
        value: string;
    },
    /**
     * The API session cookie. If not given, there is no cookie assigment
     * available. 
     */
    sessionCookie?: string|Record<string,string|boolean>;
}

/**
 * The schema for singup form validation with zod.
 */
export const SignupFormSchema = z.object({
    email: z.string().email({ message: 'Please, enter a valid email.' }).trim(),
    password: z.string().min(14, { message: 'Be at least 14 characters long.' })
        .regex(/\p{Lu}/u, { message: "Contain at least one upper case letter." })
        .regex(/\p{N}/u, { message: "Contain at least one digit." })
        .regex(/^\P{Cc}+$/u, { message: "Cannot contain control characters." })
        .regex(/[^\p{N}a-zA-Z]/u, { message: "Contain at least one special character." }).trim(),
    displayName: z.optional(z.string().regex(/^$|[\p{Lu}\p{Lt}]\p{Ll}+/u, { message: "Name must have at least one titled letter." }).trim()),
    confirmPassword: z.string().min(14, { message: 'Be at least 14 characters long.' })
        .regex(/\p{Lu}/u, { message: "Contain at least one upper case letter." })
        .regex(/\p{N}/u, { message: "Contain at least one digit." })
        .regex(/^\P{Cc}+$/u, { message: "Cannot contain control characters." })
        .regex(/[^\p{N}a-zA-Z]/u, { message: "Contain at least one special character." }).trim()
}).refine(
    (data) => (data.password === data.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] }));
/**
 * The schema for edit form validation with zod.
 */
export const EditFormSchema = z.object({
    email: z.optional(z.string().email({ message: 'Please, enter a valid email.' }).trim()),
    password: z.optional(z.string().min(14, { message: 'Be at least 14 characters long.' })
        .regex(/\p{Lu}/u, { message: "Contain at least one upper case letter." })
        .regex(/\p{N}/u, { message: "Contain at least one digit." })
        .regex(/^\P{Cc}+$/u, { message: "Cannot contain control characters." })
        .regex(/[^\p{N}a-zA-Z]/u, { message: "Contain at least one special character." }).trim()),
    displayName: z.optional(z.optional(z.string().regex(/[\p{Lu}\p{Lt}]\p{Ll}+/u, { message: "Name must have at least one titled letter." }).trim())),
    confirmPassword: z.optional(z.string().min(14, { message: 'Be at least 14 characters long.' })
        .regex(/\p{Lu}/u, { message: "Contain at least one upper case letter." })
        .regex(/\p{N}/u, { message: "Contain at least one digit." })
        .regex(/^\P{Cc}+$/u, { message: "Cannot contain control characters." })
        .regex(/[^\p{N}a-zA-Z]/u, { message: "Contain at least one special character." }).trim())
}).refine((data) => (data.password === data.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] }));
/**
 * The schema for login form validation with zod.
 */
export const LoginFormSchema = z.object({
    email: z.string().email({ message: 'Please, enter a valid email.' }).trim(),
    password: z.string().trim(),
});

/**
 * Errro type constructed from type.
 */
export type ErrorType<TYPE> = {
    [Property in keyof TYPE]: string[];
};

/**
 * The sign up form state.
 */
export type SignupFormState = {
    values?: Record<"email"|"password"|"confirmPassword"|"displayName", string>,
    errors?: ErrorType<{name?: string[], password?: string[], confirmPassword?: string[], displayName?: string[]}>,
    origin?: string,
} | undefined;



export type LoginFormParams = Record<"email"|"password", string>;

/**
 * The login form state.
 */
export type LoginFormState = {
    values?: Partial<LoginFormParams>,
    errors?: ErrorType<{email?: string[], password?: string[]}>,
    origin?: string,
} | undefined;


/**
 * The actions related to the authentication.
 */
export interface ErrorStruct {
    /**
     * The error message of an invalid email.
     */
    email?: string;

    /**
     * The error message of an invalid password.
     */
    password?: string;
}


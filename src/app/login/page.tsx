"use client";
import { signup, login, ErrorStruct } from '@/actions/auth.actions'
import { EmailField, PasswordField } from '@/lib/auth';
import Link from 'next/link';
import { useId } from 'react';
import { useFormState } from 'react-dom';

/**
 * The porperties of the login component.
 */
export interface LoginProperties {
    /**
     * The mode of the authentication.
     */
    mode: "signup"|"login";

    /**
     * The origin route where the successful sigin or login routes the user.
     */
    origin? : string;
}

/**
 * 
 * @param param0 
 * @returns 
 */
export default function LoginPage({ mode = "signup", origin="/"}: LoginProperties) {
    const action = (mode === "signup" ? signup : login);
    const [formState, formAction] = useFormState( action, { errors: {}, origin });
    const emailField = EmailField;
    const pwdField = PasswordField;
    const id = useId();
    const emailId = `${id}.email`;
    const pwdId = `${id}.pwd`;
    const caption = (mode === "signup" ? "Create account" : "Log in")
    const title = (mode === "signup" ? "Create a new account" : "Log in with an existing account");
    const errors = formState?.errors ?? {};

    return (<form action={formAction} id={id}>
        <div>
            <header><h1>{title}</h1></header>
            <main>
                <div>
                    <label htmlFor={emailId}>Email</label>
                    <input name={emailField} type="email" id={emailId} placeholder='Enter your email address'></input>
                    {errors && errors.email ? <div className="error">{errors.email}</div> : <div className="error hidden"></div>}
                </div>
                <div>
                    <label htmlFor={pwdId}>Email</label>
                    <input name={pwdField} type="password" id={pwdId} placeholder='Enter your password'></input>
                    {errors && errors.password ? <div className="error">{errors.password}</div> : <div className="error hidden"></div>}

                </div>
                <div className="actionbar"><button type="submit" name="submit">{caption}</button></div>
            </main>
            <footer><Link href="/login?mode=signup">Sign up with new account</Link></footer>
        </div>
    </form>);
}
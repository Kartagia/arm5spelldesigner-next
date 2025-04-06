"use client";
import { signup, login, ErrorStruct, LoginFormState } from '@/actions/auth.actions'
import { EmailField, PasswordField } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useId, useState } from 'react';
import { useFormState } from 'react-dom';

export type LoginMode = "signup"|"login";

/**
 * The porperties of the login component.
 */
export interface LoginProperties {
    /**
     * The mode of the authentication.
     */
    mode: LoginMode;

    /**
     * The origin route where the successful sigin or login routes the user.
     */
    origin? : string;
}

/**
 * The compoentn handling login and signup.
 * @param param0 
 * @returns 
 */
export function LoginComponent({ mode = "signup", origin="/", action=signup,
    onModeChange = undefined
}: 
    LoginProperties & { action: typeof signup|typeof login, onModeChange?:(newMode: LoginMode) => void}) {
    const [formState, formAction] = useFormState( action, { errors: {} as ErrorStruct, origin } as LoginFormState);
    const emailField = EmailField;
    const pwdField = PasswordField;
    const id = useId();
    const emailId = `${id}.email`;
    const pwdId = `${id}.pwd`;
    const caption = (mode === "signup" ? "Create account" : "Log in")
    const title = (mode === "signup" ? "Create a new account" : "Log in with an existing account");
    const errors = formState?.errors ?? {};

    /**
     * @todo: Add mode change handler. 
     */

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
            <footer><a onClick={(e) => {
                if (onModeChange) {
                    onModeChange("signup");
                } else {
                    redirect("/login?mode=signup");
                }
            }}>Sign up with new account</a><a onClick={(e) => {
                if (onModeChange) {
                    onModeChange("login");
                } else {
                    redirect("/login?mode=login");
                }
            }}>Login with an existing account</a></footer>
        </div>
    </form>);
}

/**
 * Create a login page.
 * @param param0 
 * @returns The JSX React content of the page.
 */
export default function LoginPage({ mode = "login", origin="/"}: LoginProperties) {
    /**
     * @todo Add getting the origin and mode from internal state.
     */
    const [currentMode, setCurrentMode] = useState(mode);

    if (mode === "signup") {
        return (<LoginComponent mode={currentMode} 
            onModeChange={ (newMode: LoginMode) => {setCurrentMode(newMode)}}
            origin={origin} action={signup} />)
    } else {
        return (<LoginComponent mode={currentMode}
            onModeChange={ (newMode: LoginMode) => {setCurrentMode(newMode)}}
            origin={origin} action={login} />)
    }
}
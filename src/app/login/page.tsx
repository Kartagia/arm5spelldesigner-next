"use client";
import { signup, login, ErrorStruct } from '@/actions/auth.actions'
import { EmailField, PasswordField } from '@/lib/auth';
import Link from 'next/link';
import { useId } from 'react';
import { useFormState } from 'react-dom';


export default function LoginPage({ mode = "signup" }: { mode: string }) {
    const action = (mode === "signup" ? signup : login);
    const [formState, formAction] = useFormState( action, {});
    const emailField = EmailField;
    const pwdField = PasswordField;
    const id = useId();
    const emailId = `${id}.email`;
    const pwdId = `${id}.pwd`;
    const caption = (mode === "signup" ? "Create account" : "Log in")
    const title = (mode === "signup" ? "Create a new account" : "Log in with an existing account");
    const errors = formState ?? {};

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
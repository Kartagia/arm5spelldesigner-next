"use client";
import { signup } from "@/actions/auth.actions";
import { useActionState, useId } from "react";


export default function SignupPage() {
    const id = useId();
    const [state, action, pending] = useActionState(signup, undefined);

    const fields = [{
        name: "email",
        label: "Email",
        type: "email"
    }, 
    {
        label: "Password",
        name: "password",
        type: "password"
    },
    {
        label: "Confirm password",
        name: "confirmPassword",
        type: "password"
    },
    {
        label: "Display name",
        name: "displayName",
        type: "text"
    }
    ]

    return (
    <form action={action}>
        <div>
            <header className="header"><h1 className="title">Create a new account</h1></header>
            <main className="main">
            {
                fields.map( field => (<div key={field.name}><div key={field.name} className="form-field">
                    <label htmlFor={`${id}:${field.name}`}>{field.label}</label>
                    <input name={field.name} id={`${id}:${field.name}`} type={field.type} defaultValue={state?.values?.[field.name] ?? ""}></input>
                </div>
                {state?.errors?.[field.name] && (<div className="error form-field"><ul>{state.errors[field.name].map( error => (<li key={error}>{error}</li>))}</ul></div>)}</div>
            ))
            }
            </main>
            <footer className="footer">
                <button disabled={pending} type="submit">Create account</button>
            </footer>
        </div>
    </form>);
}
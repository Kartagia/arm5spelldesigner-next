"use client";
import { login } from "@/actions/auth.actions";
import Link from "next/link";
import { useActionState, useId } from "react";
import { LoginFormState} from "@/lib/definitions";


export default function LoginPage() {
    const id = useId();
    const [state, action, pending] = useActionState(login, undefined);

    const fields = [{
        name: "email",
        label: "Email",
        type: "email"
    }, 
    {
        label: "Password",
        name: "password",
        type: "password"
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
                    <input name={field.name} id={`${id}:${field.name}`} type={field.type} defaultValue={state?.values && field.name in state.values ? (
                        (state?.values?.[field.name] as string) ?? "") : ""}></input>
                </div>
                { (state?.errors?.[field.name] as (string[]|undefined)) && (<div className="error form-field"><ul>{state.errors[field.name].map( (error: string[]) => (<li key={error.join("")}>{error}</li>))}</ul></div>)}</div>
            ))
            }
            </main>
            <footer className="footer">
                <button disabled={pending} type="submit">Login</button>
                <Link href="/signup" className="button">Create a new account</Link>
            </footer>
        </div>
    </form>);
}
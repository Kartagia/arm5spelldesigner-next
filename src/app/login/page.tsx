"use client";
import { login } from "@/actions/auth.actions";
import { ErrorList } from "@/components/ErrorList";
import Link from "next/link";
import { useActionState, useId } from "react";


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
    ];

    return (
        <form className="flex-item column min-w-100 min-h-100" name="login" action={action}>
        <div className="flex column min-h-100 min-w-100">
            <header className="header"><h1 className="title">Login with existing account</h1></header>
            <main className="main">
            {
                fields.map( field => (<div key={field.name}><div key={field.name} className="form-field">
                    <label htmlFor={`${id}:${field.name}`}>{field.label}</label>
                    <input name={field.name} id={`${id}:${field.name}`} type={field.type} defaultValue={state?.values && field.name in state.values ? (
                        (state?.values?.[field.name] as string) ?? "") : ""}></input>
                </div>
                <ErrorList className="form-field" errors={state?.errors || {}} errorKey={field.name} />
            </div>
            ))
            
            }
            <ErrorList className="form-field" errors={state?.errors ?? {}} errorKey="general" />
            </main>
            <footer className="footer">
                <button disabled={pending} type="submit">Login</button>
                <Link href="/signup" className="button">Create a new account</Link>
            </footer>
        </div>
        </form>

        );
}
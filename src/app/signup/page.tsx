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
            <header></header>
            <main>
            {
                fields.map( field => (<div key={field.name}>
                    <label htmlFor={`${id}:${field.name}`}>{field.label}</label>
                    <input name={field.name} id={`${id}:${field.name}`} type={field.type}></input>
                    {state?.errors?.[field.name] && (<p className="error">{state.errors[field.name]}</p>)}
                </div>))
            }
            </main>
            <footer>
                <button disabled={pending} type="submit">Create account</button>
            </footer>
        </div>
    </form>);
}
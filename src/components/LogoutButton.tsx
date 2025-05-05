"use client";
import { logout } from "@/actions/auth.actions";
import { ButtonHTMLAttributes } from "react";


export default function LogoutButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {

    return (<button onClick={async () => {await logout()}} disabled={props.disabled}>{props.children}</button>)
}
import { updateSessionAction } from "@/actions/auth.actions";
import { validateSession } from "@/lib/session";
import { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { startTransition } from "react";

export const metadata: Metadata = {
    title: "Ars Magica Campaign Aid (Logged in)",
    description: "Ars Magica Campaign Aid logged in",
};
  
/**
 * Layout securs the pages under it.
 * @param param0 
 * @returns The react component of the element.
 */
export default async function LoggedLayout({children}:Readonly<{
    children: React.ReactNode;
  }>) {

    return <>{children}</>;
  }
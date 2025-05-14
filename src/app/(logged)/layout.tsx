import LogoutButton from "@/components/LogoutButton";
import { validateSession } from "@/lib/session";
import { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
    title: "Ars Magica Campaign Aid (Logged in)",
    description: "Ars Magica Campaign Aid logged in",
};
  
async function SecuredContent() {
  const {userInfo} = await validateSession( (await cookies()).get("auth_session")?.value ?? "");
  if (userInfo)  {
    // Creting logged user navigation bar. 
    return <nav className="header h-auto w-full buttonbar">{ userInfo ? <LogoutButton>Logout</LogoutButton> : <Link href="/login" className="button">Login</Link>}</nav>
  } else {
    // Creating unlogged user navigation bar.
    return <nav className="header h-auto w-full buttonbar">{ <Link href="/login" className="button">Login</Link>}</nav> 
  }
}

/**
 * Layout securs the pages under it.
 * @param param0 
 * @returns The react component of the element.
 */
export default async function LoggedLayout({children}:Readonly<{
    children: React.ReactNode;
  }>) {

    return <>
    <Suspense fallback="Loading user informaiton"><SecuredContent /></Suspense>
    {children}</>
  }
import type { Metadata, ResolvingMetadata } from "next";
import { Caudex } from "next/font/google";
import "./globals.css";
import { fstat } from "fs";
import { Suspense } from "react";
import Image from "next/image";
import { validateSession } from "@/lib/session";
import { cookies } from "next/headers";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

const caudexSans = Caudex({
  weight: "400",
  subsets: ["latin", "greek"],
  variable: "--font-sans"
})

const caudexSansBold = Caudex({
  weight: "700",
  subsets: ["latin", "greek"],
  variable: "--font-sans-bold"
})


async function getDictionary( lang: string) {
  return {
    title: "Ars Magica Campaign Aid",
    description: "Ars magica campaign aid.",
  }
}

export const metadata : Metadata = {
  ...(await getDictionary("en-US"))
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const {userInfo} = await validateSession( (await cookies()).get("auth_session")?.value ?? "");


  return (
    <html lang="en">
      <body
        className={`${caudexSans.variable} ${caudexSansBold.variable} font-[family-name:var(--font-sans)] flex column w-full h-full`}
      >
        <header className="header h-auto w-full"><h1 className="title"><Suspense>{metadata.title?.toString()}</Suspense></h1></header>
        <nav className="header h-auto w-full buttonbar">{userInfo ? <LogoutButton>Logout</LogoutButton> : <Link href="/login" className="button">Login</Link>}</nav>
        <main className="main flex h-full w-full flex column">{children}</main>
        <footer className="footer h-auto w-full flex column flex-item-remainder"><Image src="/arm5openlicenselogo.png" alt="Ars Magica Open License logo" width={120} height={60}/>
        
        </footer>
      </body>
    </html>
  );
}

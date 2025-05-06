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
        className={`${caudexSans.variable} ${caudexSansBold.variable} font-[family-name:var(--font-sans)] flex column min-h-100`}
      >
        <header className="header"><h1 className="title"><Suspense>{metadata.title?.toString()}</Suspense></h1></header>
        <main className="main flex">{children}</main>
        <footer className="footer"><Image src="/next.svg" alt="NextJS logo" width={200} height={60}/>
        {userInfo ? <LogoutButton>Logout</LogoutButton> : <Link href="/login" className="button">Login</Link>}
        </footer>
      </body>
    </html>
  );
}

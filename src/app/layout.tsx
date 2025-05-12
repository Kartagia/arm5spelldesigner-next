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



export const metadata : Metadata = {
    title: "Ars Magica Campaign Aid",
    description: "Ars magica campaign aid.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${caudexSans.variable} ${caudexSansBold.variable} font-[family-name:var(--font-sans)] flex column w-full h-full`}
      >
        <header className="header h-auto w-full"><h1 className="title"><Suspense fallback={process.env.APPLICATION_NAME ?? "Loading..."}>{metadata.title?.toString()}</Suspense></h1></header>
        <main className="main flex h-full w-full flex column overflow-y">{children}</main>
        <footer className="footer h-auto w-full flex column flex-item-remainder"><Image src="/arm5openlicenselogo.png" alt="Ars Magica Open License logo" width={120} height={60}/>
        
        </footer>
      </body>
    </html>
  );
}

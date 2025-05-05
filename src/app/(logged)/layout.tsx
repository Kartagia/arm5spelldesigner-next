import { Metadata } from "next";

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

    return <>{children}</>
  }
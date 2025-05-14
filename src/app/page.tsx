import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="grid grid-rows-[20px_1fr_20px] h-0 text-center items-center justify-items-center min-h-screen p-8 pb-0 gap-16 sm:p-0 font-[family-name:var(--font-sans)]">
      <header className="flex flex-col items-center sm:items-start font-[family-name:var(--font-sans)]">
        <h1 className="title">Ars Magica Campaign Aid</h1>
      <p className="subtitle">The temporary starting page</p></header>
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <ul>
          <li className="button primary"><Link href="/spells">Link to the spell designer.</Link></li>
          <li className="button primary"><Link href="/login">Log in with existing account</Link></li>
          <li className="button primary"><Link href="/signup">Create new account</Link></li>
        </ul>
        
        
        
      </main>
    </main>
  );
}

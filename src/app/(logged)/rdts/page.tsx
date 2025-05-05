"use server";

import { RDTPanel } from "@/components/RDTPanel";
import { getAllRDTs } from "@/data/rdts";
import { Suspense } from "react";


/**
 * The for RDTS.
 */
export default async function RDTSPage() {


    const rdts = await getAllRDTs();

    return (<div className="flex column">
        <header className="header">Ranges, Durations, and Targets</header>
        <main className="main"><RDTPanel rdts={rdts}></RDTPanel></main>
        <footer className="footer"></footer>
    </div>)
}
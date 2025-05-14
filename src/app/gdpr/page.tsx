
"use client";
import React, { ReactNode, useState } from "react"
import styles from './page.module.css';
import { Topic } from "@/components/gdpr/Topic";
import { ContactInformations } from "../../components/gdpr/ContactInformations";
import { generateRigths, createRigths } from "../../components/gdpr/Rights";
import { DataCollectionInfo, filterItems } from "@/components/gdpr/gdpr-utils";
import { set } from "zod";

/**
 * Create a new GDRP page.
 * @returns The NextJS page showing GDPR related information.
 */
export default function GRDPPage() {
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const org = "Ars Magica Campaign Aid";
    const email = "antti@kautiainen.com";
    const ourContactInfo: ContactInformations = {
        "email": {
            name: "email",
            title: (<>Our email address <a href={email}>{email}</a></>),
            address: email
        }
    };
    const parent: Array<ReactNode>|undefined = undefined;
    const collectedData: Record<string, DataCollectionInfo> = {
        "common": {
            reason: "Manage your account.",
            how: "You use our wewbsite or API.",
            when: "Use our web site or API."
        },
        "Personal identification information (Only email ddress)": {
            when: "Register online.",
            reason: "To send you password recoverly link.",
            how: "Register online."
        }
    }

    return (<div className={styles.gdpr + " flex flex-item flex column min-w-100 h-100 max-h-100"}>
        <header className="header title h-10">GRDP information</header>
        <main className="main min-h-100 max-h-80 min-w-100 column scroll">
            <div className="flex column min-h-100 max-h-100">
                <header className="header min-w-100 max-h-10"><span onClick={ (e) => {
            setShowPrivacyPolicy( (current) => (!current))} }>Privacy Policy{showPrivacyPolicy ? " [Open]" : " [Closed]"}</span></header>
                <main className={showPrivacyPolicy ? "main h-80 max-h-80 min-h-80 column scroll" : "hidden"}>
                    <p>{org}{ (parent ?? []).length > 0? <> {parent}</> : <></>}. This privacy policy wil explain
                    how our organization uses the personal data we collect from you when you use our website.</p>
                    <Topic title="What data do we collect?" ingress="Our company collects following data:" items={
                        filterItems( collectedData, ()=>undefined, {filter:(category => (category !== "common"))})
                    } />
                    <Topic title="How do we collect your data?" ingress={<>You directly provide {org} with most of the data we collect.
                        We collect data and porcess data when you:</>} items={
                        filterItems( collectedData, (item)=>(item.when), {removeDuplicates: true})
                    } />
                    <Topic title="How will we use your data?"
                    ingress="Our company collects your data so we can:"
                    items={
                        filterItems( collectedData, (item) => (item.reason), {removeDuplicates: true})
                    }
                    />
                    <Topic title="How do we store your data?"
                    ingress=""
                    items={{
                        "email": "Your email address is stored until you delete your account, or request removal of email address causing removal of your account.",
                        "private content": "Your private content is stored in the database. The private content is removed with user removal.",
                        "public content": "Public content is stored in the database. The link from content to you is removed along with the " +
                        "removal of the account."
                    } as Record<string, ReactNode>}
                    />
                    <Topic title="You are your data protection rights?"
                    ingress=""
                    items={
                        filterItems(generateRigths(org, ourContactInfo), 
                        createRigths)}
                    />
                    <Topic title="What are cookies?"
                    ingress={<>
                    <p>Cookies are text files placed on your computer to collect standard Internet log information and visitor behavior information.
                    When you visit our websites, we may collect informatoin frmo you automatically through cookies or simiar technology.</p>
                    <p>For further information, visit <a href="https://allaboutcookies.org">allaboutcookies.org</a>.</p>
                    </>} items={{}}
                    />
                    <Topic title="How do we use cookies?"
                    ingress={<>There are a number of different types of cookies, however, our webiste uses:</>}
                    items={
                        filterItems( {Functionality: (<>{org} ueses these cookies so that we recognize you on our website, and can access the API</>)}, (item: ReactNode, category?: string) => (item))
                    }
                    />
                </main>
            </div>
        </main>
        <footer className="footer"></footer>
    </div>);
}


import { headers } from "next/headers";
import { AccessMethods, ApiKeyStorage, generateKey } from "../../src/data/api_keys";
import { } from "../../src/data/config_api";
import { fail } from "assert";
import { ArtKey, SpellGuideline } from "../../src/data/spells";
import { error } from "console";
import { parseGuidelines } from "@/lib/guidelineParser";

/**
 * Test for guidelines API.
 */
describe("Module API key", function () {
    describe("Create API key", function () {
        const rootKeys: string[] = [];
        const apiKeys: string[] = [];
        const storage: ApiKeyStorage = {
            apiKeys,
            rootKeys,
            addApiKey(apiKey: string) {
                if (this.apiKeys.includes(apiKey)) {
                    throw new Error("Duplicate API key");
                }
                apiKeys.push(apiKey);
                return this;
            },
            addRootApiKey(apiKey: string) {
                if (!this.apiKeys.includes(apiKey)) {
                    this.addApiKey(apiKey);
                }
                if (!this.rootKeys.includes(apiKey)) {
                    rootKeys.push(apiKey);
                }
                return this;
            },
            addAccess(apiKey: string, route: string | undefined = "/", ...methods: AccessMethods[]): ApiKeyStorage {
                throw new Error("Function not implemented.");
            },
            revokeAccess(apiKey: string, route: string | undefined, ...methods: AccessMethods[]): ApiKeyStorage {
                throw new Error("Function not implemented.");
            }
        };
        it.concurrent("Test generate key", async () => {
            const key = generateKey(storage);
            expect(key).a("string", "Generated key is not a string!");
            expect(key).match(/^[\da-z]+$/, "The generated guid was not a proper string.")
        })
    });
});

describe.skip.concurrent("parseGuidelines", function () {
    const sources: [string, (URL | string), SpellGuideline[]|undefined, any?][] = [
        [
            "Single Creo Animal guideline",
            "Animal Spells\nCreo Animal Guidelines\nLevel 1: Give an animal a +1 bonus to Recovery rolls.", 
            [{name: "Give an animal a +1 bonus to Recovery rolls.", level: 1, form: new ArtKey("Cr"), technique: new ArtKey("An")}]
        ],
        [
            "Empty set",
            "",
            [],
            undefined
        ]
    ];
    sources.forEach(([title, source, expected, error=undefined]) => {
        it(`Valid source ${title}`, async () => {
            if (source instanceof URL) {
                const result = fetch(source, {
                    headers: {
                        "Content-Type": "text/plain"
                    }
                }).then(
                    response => {
                        if (response.ok) {
                            response.text().then((lines) => (parseGuidelines(lines)))
                        } else {
                            throw new Error(`Loading ${source} failed: ${response.status} ${response.statusText}`);
                        }
                    }
                );
                if (error) {
                    await expect(result).rejects.toEqual(error);
                } else {
                    await expect(result).resolves.toEqual(expected);
                }
            } else {

                var result = parseGuidelines(source);
                if (error) {
                    expect( () => { result = parseGuidelines(source)}).toThrowError(error);
                } else {
                    expect( () => { result = parseGuidelines(source)}).not.toThrow();
                    expect(result).toBeDefined();
                    expect(result).toStrictEqual(expected);
                }
            }
        })
    })
})

describe.concurrent("Testing fetching all guidelines", function () {

    test("Fetching all guidelines without API key", async () => {
        const result = fetch("http://localhost/arm5/guidelines", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        }).then((result) => {
            if (result.ok) {
                return result.json();
            } else {
                throw new Error(result.statusText);
            }
        });
        await expect(result).rejects.toStrictEqual(new Error("Not Found"));
    });
});
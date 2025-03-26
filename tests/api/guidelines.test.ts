
import { headers } from "next/headers";
import {AccessMethods, ApiKeyStorage, generateKey} from "../../src/data/api_keys";
import {} from "../../src/data/config_api";
import { fail } from "assert";

/**
 * Test for guidelines API.
 */

describe("Module API key", function() {
    describe("Create API key", function() {
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
            addAccess(apiKey: string, route: string|undefined="/", ...methods: AccessMethods[]): ApiKeyStorage {
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

describe.concurrent("Testing fetching all guidelines", function() {

    test("Fetching all guidelines without API key", async () => {
        const result = fetch("http://localhost/arm5/guidelines", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        }).then( (result) => {
            if (result.ok) {
                return result.json();
            } else {
                throw new Error(result.statusText);
            }
        });
        result.then(
            (result) => {
                fail("The API should have returned error due no API key");
            },
            (error) => {

            }
        )
        expect(await result).throws();
    });
});
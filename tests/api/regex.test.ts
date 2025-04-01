
import { AdvancedRegex, groupRegex, getRegexSourceContent, RegExpBuilderOptions, createFlags } from "@/lib/regex";
import { TestsNotFoundError } from "vitest/node.js";

function optionsToString(options: RegExpBuilderOptions | undefined): string {
    const segments: string[] = [];
    if (options) {
        if (options.lenient) {
            segments.push("lenient");
        }
        if (options.flags) {
            segments.push(`Flags=${options.flags}`);
        }
        if (options.preserveFlags) {
            segments.push("preserveFlags");
        }
        if (options.stripEndOfLine) {
            segments.push("stripEndOfLine");
        }
        if (options.stripStartOfLine) {
            segments.push("stripStartOfLine");
        }
        if (options.wholeString) {
            segments.push("wholeString");
        }
    } else if (options === undefined) {
        segments.push("Default options");
    }
    return segments.join(",");
}

describe("Method createFlags", () => {
    [
        { base: "", added: "", removed: "", expected: "" },
        { base: "", added: "m", removed: "", expected: "m" },
        { base: "m", added: "", removed: "", expected: "m" },
        { base: "m", added: "", removed: "m", expected: "" },
        { base: "", added: "mg", removed: "m", expected: "g" },
        { base: "mg", added: "y", removed: "", expected: "gmy" },
        { base: "mgm", added: "y", removed: "", exception: SyntaxError },
        { base: "u", added: "v", exception: SyntaxError }
    ].forEach(
        (testCase, index) => {
            if (testCase.exception) {
                it(`Create flags with "${testCase.base}" add "${testCase.added}" and remove "${testCase.removed}"`, () => {
                    expect(() => {createFlags(testCase.base, testCase.added, testCase.removed)}).toThrow(testCase.exception);
                })
            } else {
                it(`Create flags with "${testCase.base}" add "${testCase.added}" and remove "${testCase.removed}"`, () => {
                    expect(createFlags(testCase.base, testCase.added, testCase.removed)).toEqual(testCase.expected);
                })
            }
        }
    )
});

describe("method getRegexSourceContent", () => {
    var options: RegExpBuilderOptions | undefined = undefined;

    [
        { tested: /^$/, expected: "^$" },
        { tested: /^Foobar(?:\w+)/mu, expected: "^Foobar(?:\\w+)" },
        { tested: /^(\d+)\s+(?:\w+)$/, expected: "^(\\d+)\\s+(?:\\w+)$" },
        { tested: /Foobarbar/, expected: "Foobarbar" }
    ].forEach(
        (testCase, index) => {
            const options = undefined;
            it(`Test case #${index}: ${optionsToString(options)} ${testCase.tested}`, () => {
                expect(getRegexSourceContent(testCase.tested)).toEqual(testCase.expected);
            })
        }
    );
    options = { stripStartOfLine: true };
    [
        { tested: /^$/, expected: "$" }, { tested: /^Foobar(?:\w+)/mu, expected: "Foobar(?:\\w+)" },
        { tested: /^(\d+)\s+(?:\w+)$/, expected: "(\\d+)\\s+(?:\\w+)$" },
        { tested: /Foobarbar/, expected: "Foobarbar" }
    ].forEach(
        (testCase, index) => {
            const options = { stripStartOfLine: true };
            it(`Test case #${index}: ${optionsToString(options)} ${testCase.tested}`, () => {
                expect(getRegexSourceContent(testCase.tested, options)).toEqual(testCase.expected);
            })
            it(`Test case #${index} source: ${optionsToString(options)} ${testCase.tested.source}`, () => {
                expect(getRegexSourceContent(testCase.tested.source, options)).toEqual(testCase.expected);
            })
        }
    );
    options = { stripEndOfLine: true };
    [
        { tested: /^$/, expected: "^" },
        { tested: /^Foobar(?:\w+)/mu, expected: "^Foobar(?:\\w+)" },
        { tested: /^(\d+)\s+(?:\w+)$/, expected: "^(\\d+)\\s+(?:\\w+)" },
        { tested: /Foobarbar/, expected: "Foobarbar" },
        { tested: /Foobarbar\\\\$/, expected: "Foobarbar\\\\\\\\" },
        { tested: /Foobarbar\\\\\$/, expected: "Foobarbar\\\\\\\\\\$" }
    ].forEach(
        (testCase, index) => {
            it(`Test case #${index}: ${optionsToString(options)} ${testCase.tested}`, () => {
                expect(getRegexSourceContent(testCase.tested, options)).toEqual(testCase.expected);
            })
            it(`Test case #${index} source: ${optionsToString(options)} ${testCase.tested.source}`, () => {
                expect(getRegexSourceContent(testCase.tested.source, options)).toEqual(testCase.expected);
            })
        }
    );

    [
        { tested: /^$/, expected: "^" },
        { tested: /^Foobar(?:\w+)/mu, expected: "^Foobar(?:\\w+)" },
        { tested: /^(\d+)\s+(?:\w+)$/, expected: "^(\\d+)\\s+(?:\\w+)" },
        { tested: /Foobarbar/, expected: "Foobarbar" },
        { tested: /Foobarbar\\\\$/, expected: "Foobarbar\\\\\\\\" },
        { tested: /Foobarbar\\\\\$/, expected: "Foobarbar\\\\\\\\\\$" }
    ].forEach(
        (testCase, index) => {
            const options = { stripEndOfLine: true, preserveFlags: true };
            it(`Test case #${index}: ${optionsToString(options)} ${testCase.tested}`, () => {
                expect(getRegexSourceContent(testCase.tested, options)).toEqual(testCase.expected);
            })
            it(`Test case #${index} source: ${optionsToString(options)} ${testCase.tested.source}`, () => {
                expect(getRegexSourceContent(testCase.tested.source, options)).toEqual(testCase.expected);
            })
        }
    );
});

describe("method groupRegex", () => {
    var options: RegExpBuilderOptions | undefined = undefined;
    [{ tested: /^$/, expected: "/(?:^$)/" }, { tested: /^Foobar(?:\w+)/mu, expected: "/(?:^Foobar(?:\\w+))/" }].forEach(
        (testCase, index) => {
            it(`Test case #${index}: non-capturing source ${testCase.tested.source}`, () => {
                expect(groupRegex(testCase.tested.source, undefined).toString()).toEqual(testCase.expected);
            })
            it(`Test case #${index}: non-capturing ${testCase.tested.source}`, () => {
                expect(groupRegex(testCase.tested, undefined).toString()).toEqual(testCase.expected);
            })
        }
    );

    options = { preserveFlags: true };
    [{ tested: /^$/, expected: "/(?:^$)/" }, { tested: /^Foobar(?:\w+)/mu, expected: "/(?:^Foobar(?:\\w+))/mu" }].forEach(
        (testCase, index) => {
            it(`Test case #${index}: preserving the flags non-capturing source ${testCase.tested.source}`, () => {
                expect(groupRegex(testCase.tested.source, undefined, options).toString()).toEqual(testCase.expected);
            })
            it(`Test case #${index}: non-capturing ${testCase.tested.source}`, () => {
                expect(groupRegex(testCase.tested, undefined, options).toString()).toEqual(testCase.expected);
            })
        }
    );

});


describe("class AdvancedRegex", () => {
    [{ tested: /^$/, params: [[]], expected: "(?:^$)" }, { tested: /^Foobar(?:\w+)/mu, params: [[]], expected: "(?:^Foobar(?:\\w+))" }].forEach(
        (testCase, index) => {
            it(`Test case #${index}: Regexp ${testCase.tested.source} to AdvancedRegex`, () => {
                var result: AdvancedRegex;
                expect(() => { new AdvancedRegex(testCase.tested, ...testCase.params) }).not.toThrow();
                result = new AdvancedRegex(testCase.tested, ...testCase.params);
                expect(result.source).toEqual(testCase.tested.source);
            })
        }
    )

})
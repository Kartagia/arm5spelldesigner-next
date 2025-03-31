
import { AdvancedRegex, groupRegex, getRegexSourceContent } from "@/lib/regex";
import { TestsNotFoundError } from "vitest/node.js";

describe("method getRegexSourceContent", () => {
    [ {tested: /^$/, expected: "^$"}, { tested: /^Foobar(?:\w+)/mu, expected: "^Foobar(?:\w+)"}].forEach(
        ( testCase, index ) => {
            it(`Test case #${index}: ${testCase.tested.source}`, () => {
                expect(getRegexSourceContent(testCase.tested)).toEqual(testCase.expected);
            })
        }
    )
});

describe("method groupRegex", () => {
    [ {tested: /^$/, expected: "(?:^$)"}, { tested: /^Foobar(?:\w+)/mu, expected: "(?:^Foobar(?:\w+))"}].forEach(
        ( testCase, index ) => {
            it(`Test case #${index}: non-capturing ${testCase.tested.source}`, () => {
                expect(groupRegex(testCase.tested, undefined)).toEqual(testCase.expected);
            })
        }
    )
});


describe("class AdvancedRegex", () => {
    [ {tested: /^$/, params: [[]], expected: "(?:^$)"}, { tested: /^Foobar(?:\w+)/mu, params: [[]], expected: "(?:^Foobar(?:\w+))"}].forEach(
        ( testCase, index ) => {
            it(`Test case #${index}: Regexp ${testCase.tested.source} to AdvancedRegex`, () => {
                var result : AdvancedRegex;
                expect(() => { new AdvancedRegex(testCase.tested, ...testCase.params) }).not.toThrow();
                result = new AdvancedRegex(testCase.tested, ...testCase.params);
                expect(result.source).toEqual(testCase.tested.source);
            })
        }
    )

})
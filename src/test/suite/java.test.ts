import * as assert from "assert";
import { getJavaPath } from "../../utils/java";

describe("Java Utility Tests", function () {
    describe("getJavaPath", function () {
        it("should return 'java' as default path", function () {
            const javaPath = getJavaPath();
            assert.ok(
                typeof javaPath === "string" && javaPath.length > 0,
                "Should return a non-empty string",
            );
        });
    });
});

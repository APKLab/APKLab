import * as assert from "assert";
import { test } from "mocha";
import { updateTools } from "../../downloader";
import { apktool } from "../../tools";

suite("Extension Test Suite", function () {
    this.timeout(600000);
    console.log("Start all tests...");

    suiteSetup(async () => {
        console.log("Installing the tools...");
        await updateTools()
            .then(() => {
                console.log("Tools Installed!");
            })
            .catch(() => {
                console.log("Failed to install tools!");
                assert.fail("Failed to install tools!");
            });
    });

    test("Sample test", () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
        apktool.decodeAPK("test.apk", [], true);
    }).timeout(1200000);
});

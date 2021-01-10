import * as assert from "assert";
import { test } from "mocha";
import * as path from "path";
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

    test("Sample test", function () {
        this.timeout(1000000);
        console.log("here");
        const testApkPath = path.resolve(__dirname, "../../../test.apk");
        apktool.decodeAPK(testApkPath, [], true);
        console.log("reached here");
    });
});

import * as assert from "assert";
import { test } from "mocha";
import * as path from "path";
import { updateTools } from "../../downloader";
import { apktool } from "../../tools";
import * as fs from "fs";

suite("Extension Test Suite", function () {
    this.timeout(600000);
    console.log("Start all tests...");

    const testDataDir = path.resolve(__dirname, "../../../testdata");
    const simpleKeyboardDir = path.join(testDataDir, "simplekeyboard");

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

    test("Decode SimpleKeyboard.apk", async function () {
        const testApkPath = path.resolve(simpleKeyboardDir, "test.apk");
        console.log(`Decoding ${testApkPath}...`);
        await apktool.decodeAPK(testApkPath, [], false);
        const jsonFilePath = path.join(simpleKeyboardDir, "decoded_files.json");
        const jsonFileData = fs.readFileSync(jsonFilePath, "utf-8");
        const decodedFiles: string[] = JSON.parse(jsonFileData);
        console.log("Comparing file list...");
        decodedFiles.forEach((file) => {
            if (!fs.existsSync(path.join(simpleKeyboardDir, "test", file))) {
                assert.fail(`File ${file} not found!`);
            }
        });
    });
    });
});

import * as assert from "assert";
import * as path from "path";
import { updateTools } from "../../downloader";
import { apktool } from "../../tools";
import * as fs from "fs";

const testDataDir = path.resolve(__dirname, "../../../testdata");
const simpleKeyboardDir = path.join(testDataDir, "simplekeyboard");

describe("Extension Test Suite", function () {
    this.timeout(600000);

    before("Download the tools", async function () {
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

    afterEach("Clearing directory", function () {
        fs.rmdirSync(path.join(simpleKeyboardDir, "test"), { recursive: true });
    });

    it("Decode SimpleKeyboard.apk", async function () {
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

    it("Decompile SimpleKeyboard.apk", async function () {
        const testApkPath = path.resolve(simpleKeyboardDir, "test.apk");
        console.log(`Decompiling ${testApkPath}...`);
        await apktool.decodeAPK(testApkPath, [], true);
        const jsonFilePath = path.join(
            simpleKeyboardDir,
            "decompiled_files.json"
        );
        const jsonFileData = fs.readFileSync(jsonFilePath, "utf-8");
        const decodedFiles: string[] = JSON.parse(jsonFileData);
        console.log("Comparing file list...");
        decodedFiles.forEach((file) => {
            if (
                !fs.existsSync(
                    path.join(simpleKeyboardDir, "test", "java_src", file)
                )
            ) {
                assert.fail(`File ${file} not found!`);
            }
        });
    });

    it("Rebuild SimpleKeyboard.apk", async function () {
        const testApkPath = path.resolve(simpleKeyboardDir, "test.apk");
        console.log(`Decoding ${testApkPath}...`);
        await apktool.decodeAPK(testApkPath, [], false);
        const apktoolYmlPath = path.resolve(
            simpleKeyboardDir,
            "test",
            "apktool.yml"
        );
        console.log(`Rebuilding apk with ${apktoolYmlPath}...`);
        await apktool.rebuildAPK(apktoolYmlPath, ["--use-aapt2"]);
        console.log("Checking for APK output...");
        const outApkPath = path.join(
            simpleKeyboardDir,
            "test",
            "dist",
            "test.apk"
        );
        if (!fs.existsSync(outApkPath)) {
            assert.fail(`File ${outApkPath} not found!`);
        }
    });
});

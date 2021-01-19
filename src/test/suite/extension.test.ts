import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import { updateTools } from "../../downloader";
import { apktool } from "../../tools";

describe("Extension Test Suite", function () {
    this.timeout(600000);

    const testDataDir = path.resolve(__dirname, "../../../testdata");
    const simpleKeyboardDir = path.join(testDataDir, "simplekeyboard");

    // one time setup
    before("Download the tools", async function () {
        // check if the testdata submodule is cloned
        if (!fs.existsSync(simpleKeyboardDir)) {
            assert.fail("testdata submodule is not cloned");
        }
        // install the tools needed by APKLab
        console.log("Installing the tools...");
        await updateTools()
            .then(() => {
                console.log("Tools Installed!");
            })
            .catch(() => {
                assert.fail("Failed to install tools!");
            });
    });

    // cleanup test dir after each test
    afterEach("Clearing directory", function () {
        fs.rmdirSync(path.join(simpleKeyboardDir, "test"), { recursive: true });
    });

    // test the Decode feature (uses ApkTool)
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

    // test the Decompile feature (uses Jadx)
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

    // test the Rebuild & Sign feature (uses ApkTool & uber-apk-signer)
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

    // test the `empty-framework-dir` feature (uses ApkTool)
    it("Empty ApkTool Res Framework dir", async function () {
        const osAppDataDir =
            process.platform == "linux"
                ? "/.local/share"
                : process.platform == "darwin"
                ? "/Library"
                : "\\AppData\\Local";
        const apktoolDefaultFrameworkPath = path.join(
            process.env.HOME + osAppDataDir,
            "apktool",
            "framework",
            "1.apk"
        );
        console.log(
            `apktool default framework apk path: ${apktoolDefaultFrameworkPath}`
        );
        if (fs.existsSync(apktoolDefaultFrameworkPath)) {
            console.log(`Emptying apktool res-framework dir...`);
            await apktool.emptyFrameworkDir();
            if (fs.existsSync(apktoolDefaultFrameworkPath)) {
                assert.fail(`Cannot empty apktool res-framework dir...`);
            }
            console.log(`Emptied apktool res-framework dir...`);
        } else {
            assert.fail(
                `res-framework dir or default framework apk doesn't exist!`
            );
        }
    });
});

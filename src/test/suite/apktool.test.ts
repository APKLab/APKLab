import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import { checkAndInstallTools } from "../../utils/updater";
import { apktool } from "../../tools/apktool";
import { apklabDataDir } from "../../data/constants";

describe("ApkTool Tests", function () {
    this.timeout(600000);

    const testDataDir = path.resolve(__dirname, "../../../testdata");
    const simpleKeyboardDir = path.join(testDataDir, "simplekeyboard");

    before("Download tools", async function () {
        if (!fs.existsSync(simpleKeyboardDir)) {
            assert.fail("testdata submodule is not cloned");
        }
        if (!fs.existsSync(String(apklabDataDir))) {
            fs.mkdirSync(apklabDataDir);
        }
        await checkAndInstallTools();
    });

    afterEach("Clearing directory", function () {
        const tmpTestDir = path.join(simpleKeyboardDir, "test");
        if (fs.existsSync(tmpTestDir))
            fs.rmSync(tmpTestDir, { recursive: true });
    });

    it("Decode SimpleKeyboard.apk", async function () {
        const testApkPath = path.resolve(simpleKeyboardDir, "test.apk");
        const projectDir = path.resolve(simpleKeyboardDir, "test");
        await apktool.decodeAPK(testApkPath, projectDir, []);
        const jsonFilePath = path.join(simpleKeyboardDir, "decoded_files.json");
        const jsonFileData = fs.readFileSync(jsonFilePath, "utf-8");
        const decodedFiles: string[] = JSON.parse(jsonFileData);
        decodedFiles.forEach((file) => {
            if (!fs.existsSync(path.join(simpleKeyboardDir, "test", file))) {
                assert.fail(`File ${file} not found!`);
            }
        });
    });

    it("Rebuild SimpleKeyboard.apk", async function () {
        const testApkPath = path.resolve(simpleKeyboardDir, "test.apk");
        const projectDir = path.resolve(simpleKeyboardDir, "test");
        await apktool.decodeAPK(testApkPath, projectDir, []);
        const apktoolYmlPath = path.resolve(
            simpleKeyboardDir,
            "test",
            "apktool.yml",
        );
        await apktool.rebuildAPK(apktoolYmlPath, []);
        const outApkPath = path.join(
            simpleKeyboardDir,
            "test",
            "dist",
            "test.apk",
        );
        if (!fs.existsSync(outApkPath)) {
            assert.fail(`File ${outApkPath} not found!`);
        }
    });

    it("Clean ApkTool Res Framework dir", async function () {
        // Just verify clean-frameworks runs without error.
        // In apktool 3.0+, clean-frameworks only removes user-installed
        // frameworks — the default 1.apk may remain, which is expected.
        await apktool.emptyFrameworkDir();
    });
});

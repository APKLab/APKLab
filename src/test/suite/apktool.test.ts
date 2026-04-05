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
            "1.apk",
        );
        if (fs.existsSync(apktoolDefaultFrameworkPath)) {
            await apktool.emptyFrameworkDir();
            if (fs.existsSync(apktoolDefaultFrameworkPath)) {
                assert.fail(`Cannot empty apktool res-framework dir...`);
            }
        } else {
            assert.fail(
                `res-framework dir or default framework apk doesn't exist!`,
            );
        }
    });
});

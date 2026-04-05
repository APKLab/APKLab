import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import { checkAndInstallTools } from "../../utils/updater";
import { jadx } from "../../tools/jadx";
import { apklabDataDir } from "../../data/constants";

describe("JADX Tests", function () {
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

    it("Decompile SimpleKeyboard.apk", async function () {
        const testApkPath = path.resolve(simpleKeyboardDir, "test.apk");
        const projectDir = path.resolve(simpleKeyboardDir, "test");
        await jadx.decompileAPK(testApkPath, projectDir, []);
        const jsonFilePath = path.join(
            simpleKeyboardDir,
            "decompiled_files.json",
        );
        const jsonFileData = fs.readFileSync(jsonFilePath, "utf-8");
        const decompiledFiles: string[] = JSON.parse(jsonFileData);
        decompiledFiles.forEach((file) => {
            if (
                !fs.existsSync(
                    path.join(simpleKeyboardDir, "test", "java_src", file),
                )
            ) {
                assert.fail(`File ${file} not found!`);
            }
        });
    });
});

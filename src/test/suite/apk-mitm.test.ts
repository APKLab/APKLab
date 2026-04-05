import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import { checkAndInstallTools } from "../../utils/updater";
import { apktool } from "../../tools/apktool";
import { apkMitm } from "../../tools/apk-mitm";
import { apklabDataDir } from "../../data/constants";

describe("APK-MITM Tests", function () {
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

    it("Patch for HTTPS inspection(apk-mitm)", async function () {
        const testApkPath = path.resolve(simpleKeyboardDir, "test.apk");
        const projectDir = path.resolve(simpleKeyboardDir, "test");

        await apktool.decodeAPK(testApkPath, projectDir, []);
        const apktoolYmlPath = path.resolve(projectDir, "apktool.yml");

        await apkMitm.applyMitmPatches(apktoolYmlPath);

        const nscFile = path.join(projectDir, "res", "xml", "nsc_mitm.xml");
        if (!fs.existsSync(nscFile)) {
            assert.fail(`NSC File ${nscFile} not found!`);
        }
    });
});

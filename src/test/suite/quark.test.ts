import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import { checkAndInstallTools } from "../../utils/updater";
import { Quark } from "../../tools/quark-engine";
import { apklabDataDir } from "../../data/constants";

describe("Quark Engine Tests", function () {
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

    it("Quark-engine Analysis", async function () {
        const testApkPath = path.resolve(simpleKeyboardDir, "test.apk");
        const projectDir = path.resolve(simpleKeyboardDir, "test");
        fs.mkdirSync(projectDir);

        await Quark.analyzeAPK(testApkPath, projectDir);

        const reportFile = path.join(projectDir, "quarkReport.json");
        if (!fs.existsSync(reportFile)) {
            assert.fail(`Analysis Report file ${reportFile} not found!`);
        }
        const reportData = JSON.parse(
            fs.readFileSync(reportFile, "utf-8"),
        ) as Record<string, unknown>;

        const isValidJSON =
            reportData.md5 === "43f18bf40ee1896b24dceb3de355bc9f" &&
            reportData.apk_filename === "test.apk" &&
            reportData.size_bytes === 874736 &&
            Object.prototype.hasOwnProperty.call(reportData, "threat_level") &&
            Object.prototype.hasOwnProperty.call(reportData, "total_score") &&
            Array.isArray(reportData.crimes) &&
            reportData.crimes.length > 0;
        if (!isValidJSON) {
            assert.fail(`Quark report data is not valid!`);
        }
        await Quark.showSummaryReport(reportFile);
    });
});

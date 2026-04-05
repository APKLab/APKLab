import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import { checkAndInstallTools } from "../../utils/updater";
import { apktool } from "../../tools/apktool";
import { git } from "../../tools/git";
import { apklabDataDir } from "../../data/constants";

describe("Git Tool Tests", function () {
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

    it("git init in project dir", async function () {
        const testApkPath = path.resolve(simpleKeyboardDir, "test.apk");
        const projectDir = path.resolve(simpleKeyboardDir, "test");

        await apktool.decodeAPK(testApkPath, projectDir, []);
        await git.initGitDir(projectDir, "initial commit 0abcd1234");

        const gitignoreFile = path.join(projectDir, ".gitignore");
        if (!fs.existsSync(gitignoreFile)) {
            assert.fail(`.gitignore file ${gitignoreFile} not found!`);
        }
        const gitignoreData = fs.readFileSync(gitignoreFile, "utf-8");
        if (gitignoreData !== "/build\n/dist\n")
            assert.fail(`${gitignoreFile} doesn't contain ${gitignoreData}`);

        const gitDir = path.join(projectDir, ".git");
        if (
            !fs.existsSync(gitDir) ||
            !fs.existsSync(path.join(gitDir, "HEAD")) ||
            !fs.existsSync(path.join(gitDir, "config"))
        ) {
            assert.fail(`.git/ dir ${gitDir} not valid!`);
        }
        const gitConfigFile = path.join(gitDir, "config");
        const gitConfigData = fs.readFileSync(gitConfigFile, "utf-8");
        if (!gitConfigData.includes("safecrlf = false")) {
            assert.fail(`git config file ${gitConfigFile} not valid!`);
        }
    });
});

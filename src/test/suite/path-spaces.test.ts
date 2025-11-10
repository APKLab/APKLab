import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { apktool } from "../../tools/apktool";
import { jadx } from "../../tools/jadx";
import { Quark } from "../../tools/quark-engine";
import { checkAndInstallTools } from "../../utils/updater";
import { apklabDataDir } from "../../data/constants";

/**
 * Integration tests for path handling with spaces in filenames/directories.
 * These tests verify that the extension works correctly on Windows and other
 * platforms when paths contain space characters.
 */
describe("Path Handling - Spaces in Paths", function () {
    // Increase timeout for tool operations
    this.timeout(300000);

    const testDataDir = path.resolve(__dirname, "../../../testdata");
    const simpleKeyboardDir = path.join(testDataDir, "simplekeyboard");
    const testDirWithSpaces = path.join(testDataDir, "test with spaces");

    before("Install tools and setup test directory", async function () {
        // create .apklab dir if it doesn't exist
        if (!fs.existsSync(apklabDataDir)) {
            fs.mkdirSync(apklabDataDir);
        }

        // Create test directory with spaces
        if (!fs.existsSync(testDirWithSpaces)) {
            fs.mkdirSync(testDirWithSpaces, { recursive: true });
        }

        // Install the tools needed by APKLab
        console.log("Installing the tools...");
        await checkAndInstallTools()
            .then(() => {
                console.log("Tools Installed!");
            })
            .catch(() => {
                assert.fail("Failed to install tools!");
            });
    });

    after("Cleanup test directory", function () {
        // Clean up test directory with spaces
        if (fs.existsSync(testDirWithSpaces)) {
            fs.rmSync(testDirWithSpaces, { recursive: true });
        }
    });

    // Cleanup after each test
    afterEach("Clearing output directories", function () {
        const projectDir = path.join(testDirWithSpaces, "test project");
        if (fs.existsSync(projectDir)) {
            fs.rmSync(projectDir, { recursive: true });
        }
    });

    it("Decode APK with spaces in directory path", async function () {
        // Copy test APK to directory with spaces
        const sourceApk = path.resolve(simpleKeyboardDir, "test.apk");
        const targetApk = path.join(testDirWithSpaces, "test.apk");
        fs.copyFileSync(sourceApk, targetApk);

        const projectDir = path.join(testDirWithSpaces, "test project");

        console.log(`Decoding ${targetApk} into ${projectDir}...`);
        await apktool.decodeAPK(targetApk, projectDir, []);

        // Verify apktool.yml was created
        const apktoolYmlPath = path.join(projectDir, "apktool.yml");
        if (!fs.existsSync(apktoolYmlPath)) {
            assert.fail(`File ${apktoolYmlPath} not found!`);
        }

        console.log("✓ Successfully decoded APK with spaces in path");
    });

    it("Decode APK with spaces in filename", async function () {
        // Copy test APK with spaces in filename
        const sourceApk = path.resolve(simpleKeyboardDir, "test.apk");
        const targetApk = path.join(
            testDirWithSpaces,
            "test file with spaces.apk",
        );
        fs.copyFileSync(sourceApk, targetApk);

        const projectDir = path.join(
            testDirWithSpaces,
            "test file with spaces",
        );

        console.log(`Decoding ${targetApk} into ${projectDir}...`);
        await apktool.decodeAPK(targetApk, projectDir, []);

        // Verify apktool.yml was created
        const apktoolYmlPath = path.join(projectDir, "apktool.yml");
        if (!fs.existsSync(apktoolYmlPath)) {
            assert.fail(`File ${apktoolYmlPath} not found!`);
        }

        console.log("✓ Successfully decoded APK with spaces in filename");
    });

    it("Decompile APK with spaces in path", async function () {
        // Copy test APK to directory with spaces
        const sourceApk = path.resolve(simpleKeyboardDir, "test.apk");
        const targetApk = path.join(testDirWithSpaces, "test.apk");
        fs.copyFileSync(sourceApk, targetApk);

        const projectDir = path.join(testDirWithSpaces, "test project");
        fs.mkdirSync(projectDir, { recursive: true });

        console.log(`Decompiling ${targetApk} into ${projectDir}...`);
        await jadx.decompileAPK(targetApk, projectDir, []);

        // Verify java_src directory was created
        const javaSrcDir = path.join(projectDir, "java_src");
        if (!fs.existsSync(javaSrcDir)) {
            assert.fail(`Directory ${javaSrcDir} not found!`);
        }

        console.log("✓ Successfully decompiled APK with spaces in path");
    });

    it("Rebuild APK from directory with spaces", async function () {
        // First decode the APK
        const sourceApk = path.resolve(simpleKeyboardDir, "test.apk");
        const targetApk = path.join(testDirWithSpaces, "test.apk");
        fs.copyFileSync(sourceApk, targetApk);

        const projectDir = path.join(testDirWithSpaces, "test project");

        console.log(`Decoding ${targetApk}...`);
        await apktool.decodeAPK(targetApk, projectDir, []);

        const apktoolYmlPath = path.join(projectDir, "apktool.yml");
        console.log(`Rebuilding from ${apktoolYmlPath}...`);
        await apktool.rebuildAPK(apktoolYmlPath, []);

        // Verify rebuilt APK exists
        const outApkPath = path.join(projectDir, "dist", "test.apk");
        if (!fs.existsSync(outApkPath)) {
            assert.fail(`Rebuilt APK ${outApkPath} not found!`);
        }

        console.log("✓ Successfully rebuilt APK from directory with spaces");
    });

    it("Quark analysis with spaces in path", async function () {
        // Skip if Quark is not installed
        if (!Quark.checkQuarkInstalled()) {
            console.log("Skipping: Quark-Engine not installed");
            this.skip();
            return;
        }

        // Copy test APK to directory with spaces
        const sourceApk = path.resolve(simpleKeyboardDir, "test.apk");
        const targetApk = path.join(testDirWithSpaces, "test.apk");
        fs.copyFileSync(sourceApk, targetApk);

        const projectDir = path.join(testDirWithSpaces, "test project");
        fs.mkdirSync(projectDir, { recursive: true });

        console.log(`Analyzing ${targetApk}...`);
        await Quark.analyzeAPK(targetApk, projectDir);

        // Verify report was created
        const reportFile = path.join(projectDir, "quarkReport.json");
        if (!fs.existsSync(reportFile)) {
            assert.fail(`Quark report ${reportFile} not found!`);
        }

        console.log("✓ Successfully analyzed APK with spaces in path");
    });

    it("Handle deeply nested path with multiple spaces", async function () {
        // Create a deeply nested directory structure with spaces
        const deepDir = path.join(
            testDirWithSpaces,
            "level one",
            "level two",
            "level three",
        );
        fs.mkdirSync(deepDir, { recursive: true });

        // Copy test APK
        const sourceApk = path.resolve(simpleKeyboardDir, "test.apk");
        const targetApk = path.join(deepDir, "test.apk");
        fs.copyFileSync(sourceApk, targetApk);

        const projectDir = path.join(deepDir, "test project");

        console.log(`Decoding ${targetApk} into ${projectDir}...`);
        await apktool.decodeAPK(targetApk, projectDir, []);

        // Verify apktool.yml was created
        const apktoolYmlPath = path.join(projectDir, "apktool.yml");
        if (!fs.existsSync(apktoolYmlPath)) {
            assert.fail(`File ${apktoolYmlPath} not found!`);
        }

        console.log("✓ Successfully handled deeply nested path with spaces");

        // Cleanup deep directory
        const topLevelDir = path.join(testDirWithSpaces, "level one");
        if (fs.existsSync(topLevelDir)) {
            fs.rmSync(topLevelDir, { recursive: true });
        }
    });

    it("Handle special characters in path (Windows-safe)", async function () {
        // Test with special characters that are valid on all platforms
        // Avoiding: < > : " / \ | ? * (not allowed on Windows)
        const specialDir = path.join(testDirWithSpaces, "test (with) special");
        fs.mkdirSync(specialDir, { recursive: true });

        const sourceApk = path.resolve(simpleKeyboardDir, "test.apk");
        const targetApk = path.join(specialDir, "test.apk");
        fs.copyFileSync(sourceApk, targetApk);

        const projectDir = path.join(specialDir, "test project");

        console.log(`Decoding ${targetApk} into ${projectDir}...`);
        await apktool.decodeAPK(targetApk, projectDir, []);

        // Verify apktool.yml was created
        const apktoolYmlPath = path.join(projectDir, "apktool.yml");
        if (!fs.existsSync(apktoolYmlPath)) {
            assert.fail(`File ${apktoolYmlPath} not found!`);
        }

        console.log("✓ Successfully handled special characters in path");

        // Cleanup
        if (fs.existsSync(specialDir)) {
            fs.rmSync(specialDir, { recursive: true });
        }
    });
});

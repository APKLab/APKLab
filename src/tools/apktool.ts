import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { extensionConfigName, outputChannel } from "../data/constants";
import { executeProcess } from "../utils/executor";
import { apkSigner } from "./uber-apk-signer";

export namespace apktool {
    /**
     * Get original file name from `apktool.yml` file of decoded apk.
     * @param apktoolYamlPath The path of `apktool.yml` file.
     * @returns returns the original apk file name or empty string.
     */
    export function getApkNameFromApkToolYaml(apktoolYamlPath: string): string {
        try {
            const fileContent = fs.readFileSync(apktoolYamlPath);
            const regArr = /apkFileName: .*\.apk/.exec(String(fileContent));
            return regArr && regArr.length > 0 ? regArr[0].split(": ")[1] : "";
        } catch (err) {
            outputChannel.appendLine(
                "Couldn't find apkFileName in apktool.yml: " + String(err),
            );
            return "";
        }
    }

    /**
     * Decodes(Disassembles) the apk resources & dalvik bytecode using **Apktool**.
     * @param apkFilePath file path Uri for apk file to decode.
     * @param projectDir project output dir for decode/decompile/analysis.
     * @param apktoolArgs array of additional args passed to **Apktool**.
     */
    export async function decodeAPK(
        apkFilePath: string,
        projectDir: string,
        apktoolArgs: string[],
    ): Promise<void> {
        const extensionConfig =
            vscode.workspace.getConfiguration(extensionConfigName);
        const apktoolPath = extensionConfig.get("apktoolPath");
        const apkFileName = path.basename(apkFilePath);

        const report = `Decoding ${apkFileName} into ${projectDir}`;
        let args = [
            "-jar",
            String(apktoolPath),
            "d",
            apkFilePath,
            "-o",
            projectDir,
        ];
        if (apktoolArgs && apktoolArgs.length > 0) {
            args = args.concat(apktoolArgs);
        }
        const shouldExist = path.join(projectDir, "apktool.yml");
        await executeProcess({
            name: "Decoding",
            report: report,
            command: "java",
            args: args,
            shouldExist: shouldExist,
        });
    }

    /**
     * Rebuild the apk with **Apktool** and signs it with **uber-apk-signer**.
     * @param apktoolYmlPath The path of `apktool.yml` file.
     * @param apktoolArgs array of additional args passed to **Apktool**
     */
    export async function rebuildAPK(
        apktoolYmlPath: string,
        apktoolArgs: string[],
    ): Promise<void> {
        const extensionConfig =
            vscode.workspace.getConfiguration(extensionConfigName);
        const apktoolPath = extensionConfig.get("apktoolPath");
        const apkFileName = getApkNameFromApkToolYaml(apktoolYmlPath);
        if (!apkFileName) {
            return;
        }
        const projectDir = path.parse(apktoolYmlPath).dir;
        const report = `Rebuilding ${apkFileName} into ${path.basename(
            projectDir,
        )}${path.sep}dist`;
        let args = ["-jar", String(apktoolPath), "b", projectDir];
        if (apktoolArgs && apktoolArgs.length > 0) {
            args = args.concat(apktoolArgs);
        }
        const outputApkFilePath = path.join(projectDir, "dist", apkFileName);
        let canBeSigned = false;
        await executeProcess({
            name: "Rebuilding",
            report: report,
            command: "java",
            args: args,
            shouldExist: outputApkFilePath,
            onSuccess: () => {
                canBeSigned = true;
            },
        });
        if (canBeSigned) await apkSigner.signAPK(outputApkFilePath);
    }

    /**
     * Empty the **ApkTool** resource framework dir.
     */
    export async function emptyFrameworkDir(): Promise<void> {
        const extensionConfig =
            vscode.workspace.getConfiguration(extensionConfigName);
        const apktoolPath = extensionConfig.get("apktoolPath");
        const report = "Cleaning up ApkTool Framework dir";
        const args = [
            "-jar",
            String(apktoolPath),
            "empty-framework-dir",
            "--force",
        ];
        await executeProcess({
            name: "Cleanup Apktool framework dir",
            report: report,
            command: "java",
            args: args,
        });
    }
}

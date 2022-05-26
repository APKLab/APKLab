import * as path from "path";
import * as vscode from "vscode";
import { extensionConfigName } from "../data/constants";
import { executeProcess } from "../utils/executor";

export namespace jadx {
    /**
     * Decompile the APK file to Java source using **Jadx**.
     * @param apkFilePath path of the APK file.
     * @param projectDir project output dir for decode/decompile/analysis.
     * @param jadxArgs array of additional args passed to **Jadx**.
     */
    export async function decompileAPK(
        apkFilePath: string,
        projectDir: string,
        jadxArgs: string[]
    ): Promise<void> {
        const extensionConfig =
            vscode.workspace.getConfiguration(extensionConfigName);
        const jadxDirPath = extensionConfig.get("jadxDirPath");
        const jadxExeName = `jadx${
            process.platform.startsWith("win") ? ".bat" : ""
        }`;
        const jadxPath = path.join(String(jadxDirPath), "bin", jadxExeName);
        const apkDecompileDir = path.join(projectDir, "java_src");
        const apkFileName = path.basename(apkFilePath);
        const report = `Decompiling ${apkFileName} into ${apkDecompileDir}`;
        let args = ["-r", "-q", "-v", "-ds", apkDecompileDir, apkFilePath];
        if (jadxArgs && jadxArgs.length > 0) {
            args = jadxArgs.concat(args);
        }
        await executeProcess({
            name: "Decompiling",
            report: report,
            command: jadxPath,
            args: args,
            shouldExist: apkDecompileDir,
        });
    }
    export async function decompileSmaliFile(
        smaliFilePath: string,
        projectDir: string,
        jadxArgs: string[]
    ): Promise<void> {
        const extensionConfig =
            vscode.workspace.getConfiguration(extensionConfigName);
        const jadxDirPath = extensionConfig.get("jadxDirPath");
        const jadxExeName = `jadx${
            process.platform.startsWith("win") ? ".bat" : ""
        }`;
        const jadxPath = path.join(String(jadxDirPath), "bin", jadxExeName);
        const apkDecompileDir = path.join(projectDir, "java_src");
        const apkFileName = path.basename(smaliFilePath);
        const report = `Decompiling ${apkFileName} into ${apkDecompileDir}`;
        let args = ["-r", "-q", "-v", "-ds", apkDecompileDir, smaliFilePath];
        if (jadxArgs && jadxArgs.length > 0) {
            args = jadxArgs.concat(args);
        }
        await executeProcess({
            name: "Decompiling",
            report: report,
            command: jadxPath,
            args: args,
            shouldExist: apkDecompileDir,
        });
    }
}

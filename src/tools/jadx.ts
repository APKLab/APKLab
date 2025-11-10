import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { extensionConfigName, JAVA_SOURCE_DIR } from "../data/constants";
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
        jadxArgs: string[],
    ): Promise<void> {
        if (!apkFilePath || !path.isAbsolute(apkFilePath)) {
            vscode.window.showErrorMessage(
                `APKLab: Invalid APK file path: ${apkFilePath}`,
            );
            return;
        }

        const extensionConfig =
            vscode.workspace.getConfiguration(extensionConfigName);
        const jadxDirPath = extensionConfig.get("jadxDirPath");

        if (!jadxDirPath) {
            vscode.window.showErrorMessage(
                "APKLab: Jadx not configured. Please check your configuration.",
            );
            return;
        }

        const jadxExeName = `jadx${
            process.platform.startsWith("win") ? ".bat" : ""
        }`;
        const jadxPath = path.join(String(jadxDirPath), "bin", jadxExeName);

        if (!fs.existsSync(jadxPath)) {
            vscode.window.showErrorMessage(
                `APKLab: Jadx executable not found at: ${jadxPath}`,
            );
            return;
        }

        const apkDecompileDir = path.join(projectDir, JAVA_SOURCE_DIR);
        const apkFileName = path.basename(apkFilePath);
        const report = `Decompiling ${apkFileName} into ${apkDecompileDir}`;
        let args = ["-r", "-q", "-ds", apkDecompileDir, apkFilePath];
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

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { APK_FILE_EXTENSION } from "../data/constants";
import { executeProcess } from "../utils/executor";

export namespace adb {
    /**
     * Installs the selected APK file to connected android device over ADB.
     * @param apkFilePath absolute path of the APK file.
     */
    export async function installAPK(apkFilePath: string): Promise<void> {
        if (!apkFilePath || !fs.existsSync(apkFilePath)) {
            vscode.window.showErrorMessage(
                `APKLab: APK file not found: ${apkFilePath}`,
            );
            return;
        }

        if (!apkFilePath.toLowerCase().endsWith(APK_FILE_EXTENSION)) {
            vscode.window.showErrorMessage(
                `APKLab: File is not an APK: ${apkFilePath}`,
            );
            return;
        }

        const apkFileName = path.basename(apkFilePath);
        const report = `Installing ${apkFileName}`;
        const args = ["install", "-r", apkFilePath];
        await executeProcess({
            name: "Installing",
            report: report,
            command: "adb",
            args: args,
        });
    }
}

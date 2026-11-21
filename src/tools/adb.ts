import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { APK_FILE_EXTENSION } from "../data/constants";
import { executeProcess } from "../utils/executor";

export namespace adb {
    function getDeviceSdkVersion(): Promise<number> {
        return new Promise((resolve) => {
            execFile(
                "adb",
                ["shell", "getprop", "ro.build.version.sdk"],
                { timeout: 3000 },
                (err, stdout) => {
                    if (err) {
                        resolve(0);
                        return;
                    }
                    const parsed = parseInt(stdout.trim(), 10);
                    resolve(Number.isNaN(parsed) ? 0 : parsed);
                },
            );
        });
    }

    /**
     * Installs the selected APK file to connected android device over ADB.
     * @param apkFilePath absolute path of the APK file.
     * @param extraArgs optional additional ADB install arguments.
     */
    export async function installAPK(
        apkFilePath: string,
        extraArgs: string[] = [],
    ): Promise<void> {
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

        const resolvedArgs = [...extraArgs];
        if (resolvedArgs.includes("com.android.vending")) {
            if (!resolvedArgs.includes("--no-streaming")) {
                resolvedArgs.unshift("--no-streaming");
            }
            const sdk = await getDeviceSdkVersion();
            if (
                sdk >= 34 &&
                !resolvedArgs.includes("--originating-uri")
            ) {
                resolvedArgs.push(
                    "--originating-uri",
                    "https://play.google.com/store/apps",
                );
            }
        }

        const apkFileName = path.basename(apkFilePath);
        const report = `Installing ${apkFileName}`;
        const args = ["install", "-r", ...resolvedArgs, apkFilePath];
        await executeProcess({
            name: "Installing",
            report: report,
            command: "adb",
            args: args,
        });
    }
}

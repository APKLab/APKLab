import * as path from "path";
import { applyPatches, observeListr } from "apk-mitm";
import * as vscode from "vscode";
import { outputChannel } from "../data/constants";

// Defined in webpack config
declare const APK_MITM_VERSION: string;

export namespace apkMitm {
    /**
     * Apply patch to intercept HTTPS calls
     * @param apktoolYmlPath The path of `apktool.yml` file.
     */
    export async function applyMitmPatches(
        apktoolYmlPath: string
    ): Promise<void> {
        try {
            const report = "Applying patches for HTTPS inspection (MITM)";

            outputChannel.show();
            outputChannel.appendLine("-".repeat(report.length));
            outputChannel.appendLine(report);
            outputChannel.appendLine("-".repeat(report.length));

            if (!process.env["TEST"]) {
                outputChannel.appendLine(
                    `Using apk-mitm v${APK_MITM_VERSION} (https://github.com/shroudedcode/apk-mitm)\n`
                );
            }

            const projectDir = path.dirname(apktoolYmlPath);

            await observeListr(applyPatches(projectDir)).forEach((line) =>
                outputChannel.appendLine(line)
            );

            outputChannel.appendLine("\nSuccessfully applied MITM patches!");
            vscode.window.showInformationMessage(
                "APKLab: Successfully applied MITM patches!"
            );
        } catch (err: any) {
            outputChannel.appendLine(err);
            outputChannel.appendLine("Failed to apply MITM patches!");
            vscode.window.showErrorMessage(
                "APKLab: Failed to apply MITM patches!"
            );
        }
    }
}

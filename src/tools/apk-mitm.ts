import * as fs from "fs";
import * as path from "path";
import { applyPatches, observeListr } from "apk-mitm";
import * as vscode from "vscode";
import { outputChannel } from "../data/constants";

export namespace apkMitm {
    /**
     * Apply patch to intercept HTTPS calls
     * @param apktoolYmlPath The path of `apktool.yml` file.
     */
    export async function applyMitmPatches(
        apktoolYmlPath: string,
    ): Promise<void> {
        if (!apktoolYmlPath || !path.isAbsolute(apktoolYmlPath)) {
            vscode.window.showErrorMessage(
                `APKLab: Invalid apktool.yml path: ${apktoolYmlPath}`,
            );
            return;
        }

        const projectDir = path.dirname(apktoolYmlPath);
        if (!fs.existsSync(projectDir)) {
            vscode.window.showErrorMessage(
                `APKLab: Project directory not found: ${projectDir}`,
            );
            return;
        }

        try {
            const report = "Applying patches for HTTPS inspection (MITM)";

            outputChannel.show();
            outputChannel.appendLine("-".repeat(report.length));
            outputChannel.appendLine(report);
            outputChannel.appendLine("-".repeat(report.length));

            outputChannel.appendLine(
                `Using apk-mitm (https://github.com/shroudedcode/apk-mitm)\n`,
            );

            await observeListr(applyPatches(projectDir)).forEach((line) =>
                outputChannel.appendLine(line),
            );

            outputChannel.appendLine("\nSuccessfully applied MITM patches!");
            vscode.window.showInformationMessage(
                "APKLab: Successfully applied MITM patches!",
            );
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : String(err);
            outputChannel.appendLine(errorMessage);
            outputChannel.appendLine("Failed to apply MITM patches!");
            vscode.window.showErrorMessage(
                "APKLab: Failed to apply MITM patches!",
            );
        }
    }
}

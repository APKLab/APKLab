import * as path from "path";
import * as apkMitm from "apk-mitm";
import * as vscode from "vscode";
import { outputChannel } from "./common";
import { quickPickUtil } from "./quick-pick.util";

export namespace mitmTools {
    /**
     * Apply patch to intercept HTTPS calls
     * @param apktoolYmlPath The path of `apktool.yml` file.
     */
    export async function applyMitmPatch(
        apktoolYmlPath: string
    ): Promise<void> {
        try {
            const report = "Applying patch for HTTPS inspection (MITM)";

            outputChannel.show();
            outputChannel.appendLine("-".repeat(report.length));
            outputChannel.appendLine(report);
            outputChannel.appendLine("-".repeat(report.length));

            const decodeDir = path.dirname(apktoolYmlPath);

            await apkMitm
                .observeListr(apkMitm.applyPatches(decodeDir))
                .forEach((line) => outputChannel.appendLine(line));

            quickPickUtil.setQuickPickDefault(
                "rebuildQuickPickItems",
                "--debug"
            );

            outputChannel.appendLine("MITM Patch applied successfully");
            vscode.window.showInformationMessage(
                `APKLab: MITM Patch applied successfully`
            );
        } catch (err) {
            outputChannel.appendLine(err);
            outputChannel.appendLine("Failed to apply MITM patch");
            vscode.window.showErrorMessage(
                `APKLab: Failed to apply MITM patch`
            );
        }
    }
}

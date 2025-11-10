import * as fs from "fs";
import * as vscode from "vscode";
import { extensionConfigName } from "../data/constants";
import { executeProcess } from "../utils/executor";

export namespace apkSigner {
    /**
     * Signs given apk file using **uber-apk-signer** from apk/file/path.apk.
     * @param apkFilePath path of the an apk file to be signed.
     */
    export async function signAPK(apkFilePath: string): Promise<void> {
        if (!apkFilePath || !fs.existsSync(apkFilePath)) {
            vscode.window.showErrorMessage(
                `APKLab: APK file not found: ${apkFilePath}`,
            );
            return;
        }

        const extensionConfig =
            vscode.workspace.getConfiguration(extensionConfigName);
        const apkSignerPath = extensionConfig.get("apkSignerPath");

        if (!apkSignerPath || !fs.existsSync(String(apkSignerPath))) {
            vscode.window.showErrorMessage(
                "APKLab: uber-apk-signer not found. Please check your configuration.",
            );
            return;
        }

        const keystorePath = extensionConfig.get("keystorePath");
        const keystorePassword = extensionConfig.get("keystorePassword");
        const keyAlias = extensionConfig.get("keyAlias");
        const keyPassword = extensionConfig.get("keyPassword");
        const report = `Signing ${apkFilePath}`;
        const args = [
            "-jar",
            String(apkSignerPath),
            "-a",
            apkFilePath,
            "--allowResign",
            "--overwrite",
        ];
        if (
            keystorePath &&
            fs.existsSync(String(keystorePath)) &&
            keystorePassword &&
            keyAlias &&
            keyPassword
        ) {
            args.push(
                "--ks",
                String(keystorePath),
                "--ksPass",
                String(keystorePassword),
                "--ksAlias",
                String(keyAlias),
                "--ksKeyPass",
                String(keyPassword),
            );
        }
        await executeProcess({
            name: "Signing",
            report: report,
            command: "java",
            args: args,
            shouldExist: apkFilePath,
        });
    }
}

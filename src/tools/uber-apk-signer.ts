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
        const extensionConfig =
            vscode.workspace.getConfiguration(extensionConfigName);
        const apkSignerPath = extensionConfig.get("apkSignerPath");
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
                String(keyPassword)
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

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { extensionConfigName } from "../data/constants";
import { executeProcess } from "../utils/executor";

export namespace apkSigner {
    /**
     * Signs given apk file using **uber-apk-signer** from projectDir/dist/apkFileName.apk.
     * @param projectDir current directory of the project.
     * @param apkFileName name of the original apk file from `apktool.yml`.
     */
    export async function signAPK(
        projectDir: string,
        apkFileName: string
    ): Promise<void> {
        const extensionConfig =
            vscode.workspace.getConfiguration(extensionConfigName);
        const apkSignerPath = extensionConfig.get("apkSignerPath");
        const keystorePath = extensionConfig.get("keystorePath");
        const keystorePassword = extensionConfig.get("keystorePassword");
        const keyAlias = extensionConfig.get("keyAlias");
        const keyPassword = extensionConfig.get("keyPassword");
        const builtApkPath = path.join(projectDir, "dist", apkFileName);
        const report = `Signing ${path.basename(projectDir)}${path.sep}dist${
            path.sep
        }${apkFileName}`;
        const args = [
            "-jar",
            String(apkSignerPath),
            "-a",
            builtApkPath,
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
            shouldExist: builtApkPath,
        });
    }
}

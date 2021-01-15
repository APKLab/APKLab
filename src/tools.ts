import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { extensionConfigName, outputChannel } from "./common";

/**
 * Options for executeProcess function.
 */
interface ProcessOptions {
    /**
     * Name of the process. Eg: `Decoding`.
     */
    name: string;
    /**
     * Report to show in progress bar.
     */
    report: string;
    /**
     * Name of the executable. Eg: `java`.
     */
    command: string;
    /**
     * CLI arguments for the command.
     */
    args: string[];
    /**
     * A file or dir which should exist if it was successful.
     */
    shouldExist?: string;
    /**
     * Callback on success.
     */
    onSuccess?: CallableFunction;
}

/**
 * Get original file name from `apktool.yml` file of decoded apk.
 * @param apktoolYamlPath The path of `apktool.yml` file.
 * @returns returns the original apk file name or empty string.
 */
function getApkName(apktoolYamlPath: string) {
    try {
        const fileContent = fs.readFileSync(apktoolYamlPath);
        const regArr = /apkFileName: .*\.apk/.exec(String(fileContent));
        return regArr && regArr.length > 0 ? regArr[0].split(": ")[1] : "";
    } catch (err) {
        outputChannel.appendLine(
            "couldn't find apkFileName in apktool.yml: " + String(err)
        );
        return "";
    }
}

/**
 * Executes a child_process and calls a callback if provided.
 * @param processOptions Takes a ProcessOptions type to process.
 */
function executeProcess(processOptions: ProcessOptions): Thenable<void> {
    outputChannel.show();
    outputChannel.appendLine("-".repeat(processOptions.report.length));
    outputChannel.appendLine(processOptions.report);
    outputChannel.appendLine("-".repeat(processOptions.report.length));
    outputChannel.appendLine(
        `${processOptions.command} ${processOptions.args.join(" ")}`
    );

    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "APKLab",
            cancellable: true,
        },
        (progress, token) => {
            return new Promise<void>((resolve) => {
                progress.report({ message: processOptions.report });

                const cp = child_process.spawn(
                    processOptions.command,
                    processOptions.args,
                    {}
                );
                cp.stdout.on("data", (data) =>
                    outputChannel.appendLine(data.toString().trim())
                );
                cp.stderr.on("data", (data) =>
                    outputChannel.appendLine(data.toString().trim())
                );
                cp.on("error", (data) => {
                    outputChannel.appendLine(data.toString().trim());
                    vscode.window.showErrorMessage(
                        `APKLab: ${processOptions.name} process failed.`
                    );
                    resolve();
                });
                cp.on("exit", async (code) => {
                    if (
                        code === 0 &&
                        (processOptions.shouldExist
                            ? fs.existsSync(processOptions.shouldExist)
                            : true)
                    ) {
                        outputChannel.appendLine(
                            `${processOptions.name} process was successful`
                        );
                        vscode.window.showInformationMessage(
                            `APKLab: ${processOptions.name} process was successful.`
                        );
                        if (processOptions.onSuccess) {
                            await processOptions.onSuccess();
                        }
                    } else {
                        outputChannel.appendLine(
                            `${processOptions.name} process exited with code ${code}`
                        );
                        vscode.window.showErrorMessage(
                            `APKLab: ${processOptions.name} process failed.`
                        );
                    }
                    resolve();
                });
                token.onCancellationRequested(() => {
                    outputChannel.appendLine(
                        `User canceled the ${processOptions.name} process`
                    );
                    if (!cp.killed) {
                        cp.kill();
                    }
                });
            });
        }
    );
}

export namespace apktool {
    /**
     * Decodes(Disassembles) the apk resources & dalvik bytecode using **Apktool**.
     * @param apkFilePath file path Uri for apk file to decode.
     * @param apktoolArgs array of additional args passed to **Apktool**.
     * @param decompileJava if **jadx** needs to decompile the APK.
     */
    export async function decodeAPK(
        apkFilePath: string,
        apktoolArgs: string[],
        decompileJava: boolean
    ): Promise<void> {
        const extensionConfig = vscode.workspace.getConfiguration(
            extensionConfigName
        );
        const apktoolPath = extensionConfig.get("apktoolPath");
        const apkFileName = path.basename(apkFilePath);
        let apkDecodeDir = path.join(
            path.dirname(apkFilePath),
            path.parse(apkFilePath).name
        );
        // don't delete the existing dir if it does exist
        while (fs.existsSync(apkDecodeDir)) {
            apkDecodeDir = apkDecodeDir + "1";
        }
        const report = `Decoding ${apkFileName} into ${apkDecodeDir}`;
        let args = [
            "-jar",
            String(apktoolPath),
            "d",
            apkFilePath,
            "-o",
            apkDecodeDir,
        ];
        if (apktoolArgs && apktoolArgs.length > 0) {
            args = args.concat(apktoolArgs);
        }
        const shouldExist = path.join(apkDecodeDir, "apktool.yml");
        await executeProcess({
            name: "Decoding",
            report: report,
            command: "java",
            args: args,
            shouldExist: shouldExist,
            onSuccess: async () => {
                if (decompileJava) {
                    await jadx.decompileAPK(
                        apkFilePath,
                        apkFileName,
                        apkDecodeDir
                    );
                }

                // open apkDecodeDir in a new vs code window
                if (!process.env["TEST"]) {
                    await vscode.commands.executeCommand(
                        "vscode.openFolder",
                        vscode.Uri.file(apkDecodeDir),
                        true
                    );
                }
            },
        });
    }

    /**
     * Rebuild the apk with **Apktool** and signs it with **uber-apk-signer**.
     * @param apktoolYmlPath The path of `apktool.yml` file.
     * @param apktoolArgs array of additional args passed to **Apktool**
     */
    export async function rebuildAPK(
        apktoolYmlPath: string,
        apktoolArgs: string[]
    ): Promise<void> {
        const extensionConfig = vscode.workspace.getConfiguration(
            extensionConfigName
        );
        const apktoolPath = extensionConfig.get("apktoolPath");
        const apkFileName = getApkName(apktoolYmlPath);
        if (!apkFileName) {
            return;
        }
        const projectDir = path.parse(apktoolYmlPath).dir;
        const report = `Rebuilding ${apkFileName} into ${path.basename(
            projectDir
        )}${path.sep}dist`;
        let args = ["-jar", String(apktoolPath), "b", projectDir];
        if (apktoolArgs && apktoolArgs.length > 0) {
            args = args.concat(apktoolArgs);
        }
        const shouldExist = path.join(projectDir, "dist", apkFileName);
        await executeProcess({
            name: "Rebuilding",
            report: report,
            command: "java",
            args: args,
            shouldExist: shouldExist,
            onSuccess: () => {
                apkSigner.signAPK(projectDir, apkFileName);
            },
        });
    }

    /**
     * Empty the **ApkTool** resource framework dir.
     */
    export async function emptyFrameworkDir(): Promise<void> {
        const extensionConfig = vscode.workspace.getConfiguration(
            extensionConfigName
        );
        const apktoolPath = extensionConfig.get("apktoolPath");
        const report = "Cleaning up ApkTool Framework dir";
        const args = [
            "-jar",
            String(apktoolPath),
            "empty-framework-dir",
            "--force",
        ];
        await executeProcess({
            name: "Cleanup Apktool framework dir",
            report: report,
            command: "java",
            args: args,
        });
    }
}

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
        const extensionConfig = vscode.workspace.getConfiguration(
            extensionConfigName
        );
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

export namespace adb {
    /**
     * Installs the selected APK file to connected android device over ADB.
     * @param apkFilePath absolute path of the APK file.
     */
    export async function installAPK(apkFilePath: string): Promise<void> {
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

export namespace jadx {
    /**
     * Decompile the APK file to Java source using **Jadx**.
     * @param apkFilePath path of the APK file.
     * @param apkFileName name of the APK file.
     * @param apkDecodeDir dir where the APK file was decoded.
     */
    export async function decompileAPK(
        apkFilePath: string,
        apkFileName: string,
        apkDecodeDir: string
    ): Promise<void> {
        const extensionConfig = vscode.workspace.getConfiguration(
            extensionConfigName
        );
        const jadxDirPath = extensionConfig.get("jadxDirPath");
        const jadxExeName = `jadx${
            process.platform.startsWith("win") ? ".bat" : ""
        }`;
        const jadxPath = path.join(String(jadxDirPath), "bin", jadxExeName);
        const apkDecompileDir = path.join(apkDecodeDir, "java_src");
        const report = `Decompiling ${apkFileName} into ${apkDecompileDir}`;
        const args = ["-r", "-v", "-ds", apkDecompileDir, apkFilePath];
        await executeProcess({
            name: "Decompiling",
            report: report,
            command: jadxPath,
            args: args,
            shouldExist: apkDecompileDir,
        });
    }
}

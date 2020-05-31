import * as child_process from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { extensionConfig, outputChannel } from './common';


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
        let regArr = /apkFileName: .*\.apk/.exec(String(fileContent));
        return regArr && regArr.length > 0 ? regArr[0].split(": ")[1] : "";
    } catch (err) {
        outputChannel.appendLine("couldn't find apkFileName in apktool.yml: " + String(err));
        return "";
    }
}

/**
 * Executes a child_process and calls a callback if provided.
 * @param processOptions Takes a ProcessOptions type to process.
 */
function executeProcess(processOptions: ProcessOptions) {
    outputChannel.show();
    outputChannel.appendLine(processOptions.report);

    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "APKLab",
            cancellable: true,
        },
        (progress, token) => {
            return new Promise((resolve) => {
                progress.report({ message: processOptions.report });

                const cp = child_process.spawn(processOptions.command, processOptions.args, {});
                cp.stdout.on('data', (data) => outputChannel.appendLine(data.toString().trim()));
                cp.stderr.on('data', (data) => outputChannel.appendLine(data.toString().trim()));
                cp.on('error', (data) => {
                    outputChannel.appendLine(data.toString().trim());
                    vscode.window.showErrorMessage(`APKLab: ${processOptions.name} process failed.`);
                    resolve();
                });
                cp.on('exit', (code) => {
                    if (code === 0 && (processOptions.shouldExist ? fs.existsSync(processOptions.shouldExist) : true)) {
                        outputChannel.appendLine(`${processOptions.name} process was successful`);
                        vscode.window.showInformationMessage(`APKLab: ${processOptions.name} process was successful.`);
                        if (processOptions.onSuccess) {
                            processOptions.onSuccess();
                        }
                    } else {
                        outputChannel.appendLine(`${processOptions.name} process exited with code ${code}`);
                        vscode.window.showErrorMessage(`APKLab: ${processOptions.name} process failed.`);
                    }
                    resolve();
                });
                token.onCancellationRequested(() => {
                    outputChannel.appendLine(`User canceled the ${processOptions.name} process`);
                    if (!cp.killed) { cp.kill(); }
                });
            });
        }
    );
}

export namespace apktool {

    /**
     * Decodes(Disassembles) the apk resources & dalvik bytecode using **Apktool**.
     * @param apkFilePath file path Uri for apk file to decode.
     */
    export function decodeAPK(apkFilePath: string) {
        let apktoolPath = extensionConfig.get("apktoolPath");
        const apkFileName = apkFilePath.substring(apkFilePath.lastIndexOf('/') + 1);
        const apkName = apkFileName.split('.apk')[0];
        const apkDir = apkFilePath.split(apkFileName)[0];
        let apkDecodeDir = apkDir + apkName;
        // don't delete the existing dir if it does exist
        while (fs.existsSync(apkDecodeDir)) {
            apkDecodeDir = apkDecodeDir + "1";
        }
        const report = `Decoding ${apkFileName} into ${apkDecodeDir}...`;
        const args = ["-jar", String(apktoolPath), 'd', apkFilePath, '-o', apkDecodeDir];
        const shouldExist = apkDecodeDir + "/apktool.yml";
        executeProcess({
            name: "Decoding", report: report, command: "java", args: args, shouldExist: shouldExist, onSuccess: () => {
                // open apkDecodeDir in a new vs code window
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(apkDecodeDir), true);
            }
        });
    }

    /**
     * Rebuild the apk with **Apktool** (also signs it with **uber-apk-signer** post rebuild).
     * @param apktoolYmlPath The path of `apktool.yml` file.
     */
    export function rebuildAPK(apktoolYmlPath: string) {
        const apktoolPath = extensionConfig.get("apktoolPath");
        const apkFileName = getApkName(apktoolYmlPath);
        if (!apkFileName) {
            return;
        }
        const projectDir = apktoolYmlPath.split("/apktool.yml")[0];
        const projectName = projectDir.substring(projectDir.lastIndexOf("/") + 1);
        const report = `Rebuilding ${apkFileName} into ${projectName}/dist/...`;
        const args = ["-jar", String(apktoolPath), 'b', projectDir];
        const shouldExist = `${projectDir}/dist/${apkFileName}`;
        executeProcess({
            name: "Rebuilding", report: report, command: "java", args: args, shouldExist: shouldExist, onSuccess: () => {
                apkSigner.signAPK(projectDir, apkFileName);
            }
        });
    }
}

export namespace apkSigner {

    /**
     * Signs given apk file using **uber-apk-signer** from projectDir/dist/apkFileName.apk.
     * @param projectDir current directory of the project.
     * @param apkFileName name of the original apk file from `apktool.yml`.
     */
    export function signAPK(projectDir: string, apkFileName: string) {
        const apkSignerPath = extensionConfig.get("apkSignerPath");
        const builtApkPath = `${projectDir}/dist/${apkFileName}`;
        const report = `Signing ${apkFileName}...`;
        const args = ["-jar", String(apkSignerPath), '-a', builtApkPath, '--allowResign', '--overwrite'];
        executeProcess({
            name: "Signing", report: report, command: "java", args: args, shouldExist: builtApkPath
        });
    }
}

export namespace adb {

    /**
     * Installs the selected APK file to connected android device over ADB.
     * @param apkFilePath absolute path of the APK file.
     */
    export function installAPK(apkFilePath: string) {
        const apkFileName = apkFilePath.substring(apkFilePath.lastIndexOf('/') + 1);
        const report = `Installing ${apkFileName} ...`;
        const args = ["install", "-r", apkFilePath];
        executeProcess({
            name: "Installing", report: report, command: "adb", args: args
        });
    }
}
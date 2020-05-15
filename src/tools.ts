import * as child_process from 'child_process';
import * as fileSystem from 'fs';
import * as vscode from 'vscode';


const outputChannelName = "APK Lab";
const outputChannel = vscode.window.createOutputChannel(outputChannelName);
const extensionConfig = vscode.workspace.getConfiguration("apklab");

interface ProcessOptions {
    name: string;
    report: string;
    command: string;
    args: string[];
    shouldExist?: string;
    onSuccess?: CallableFunction;
}

// try to get javaPath from config first. Defaults to `java`
function getJavaPath() {
    let configJavaPath = extensionConfig.get("javaPath");
    return configJavaPath ? String(configJavaPath) : "java";
}

// get correct apkFileName from apktool.yml from decoded app
function getApkName(apktoolYamlPath: string) {
    try {
        const fileContent = fileSystem.readFileSync(apktoolYamlPath);
        let regArr = /apkFileName: .*\.apk/.exec(String(fileContent));
        return regArr && regArr.length > 0 ? regArr[0].split(": ")[1] : "";
    } catch (err) {
        outputChannel.appendLine("couldn't find apkFileName in apktool.yml: " + String(err));
        return "";
    }
}

// execute a process with @params ProcessOptions
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

                let cp = child_process.spawn(processOptions.command, processOptions.args, {});
                cp.stdout.on('data', (data) => outputChannel.appendLine(data.toString().trim()));
                cp.stderr.on('data', (data) => outputChannel.appendLine(data.toString().trim()));
                cp.on('error', (data) => {
                    outputChannel.appendLine(data.toString().trim());
                    vscode.window.showErrorMessage(`APKLab: ${processOptions.name} process failed.`);
                    resolve();
                });
                cp.on('exit', (code) => {
                    if (code === 0 && (processOptions.shouldExist ? fileSystem.existsSync(processOptions.shouldExist) : true)) {
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

    export function decodeAPK(apkFilePath: string) {
        // get apktool path from settings
        let apktoolPath = extensionConfig.get("apktoolPath");
        // check if it's not empty
        if (!apktoolPath) {
            outputChannel.appendLine("Please download apktool and update the apktoolPath in settings.");
            vscode.window.showErrorMessage("Apktool not found");
            return;
        }
        const apkFileName = apkFilePath.substring(apkFilePath.lastIndexOf('/') + 1);
        const apkName = apkFileName.split('.apk')[0];
        const apkDir = apkFilePath.split(apkFileName)[0];
        let apkDecodeDir = apkDir + apkName;
        while (fileSystem.existsSync(apkDecodeDir)) {
            apkDecodeDir = apkDecodeDir + "1";
        }
        const report = `Decoding ${apkFileName} into ${apkDecodeDir}...`;
        const args = ["-jar", String(apktoolPath), 'd', apkFilePath, '-o', apkDecodeDir];
        const shouldExist = apkDecodeDir + "/apktool.yml";
        executeProcess({
            name: "Decoding", report: report, command: getJavaPath(), args: args, shouldExist: shouldExist, onSuccess: () => {
                // open apkDecodeDir in a new vs code window
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(apkDecodeDir), true);
            }
        });
    }

    export function rebuildAPK(apktoolYmlPath: string) {
        // get apktool path from settings
        let apktoolPath = extensionConfig.get("apktoolPath");
        // check if it's not empty
        if (!apktoolPath) {
            outputChannel.appendLine("Please download apktool and update the apktoolPath in settings.");
            vscode.window.showErrorMessage("Apktool not found");
            return;
        }
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
            name: "Rebuilding", report: report, command: getJavaPath(), args: args, shouldExist: shouldExist, onSuccess: () => {
                // sign the APK
                apkSigner.signAPK(projectDir, apkFileName);
            }
        });
    }
}

export namespace apkSigner {

    export function signAPK(projectDir: string, apkFileName: string) {

        // get uber-apk-signer path from settings
        let apkSignerPath = extensionConfig.get("apkSignerPath");
        // check if it's not empty
        if (!apkSignerPath) {
            outputChannel.appendLine("Please download uber-apk-signer and update the apkSignerPath in settings.");
            vscode.window.showErrorMessage("uber-apk-signer not found");
            return;
        }
        const builtApkPath = `${projectDir}/dist/${apkFileName}`;
        const report = `Signing ${apkFileName}...`;
        const args = ["-jar", String(apkSignerPath), '-a', builtApkPath, '--allowResign'];
        const shouldExist = `${builtApkPath.substring(0, builtApkPath.lastIndexOf(".apk"))}-aligned-debugSigned.apk`;
        executeProcess({
            name: "Signing", report: report, command: getJavaPath(), args: args, shouldExist: shouldExist
        });
    }
}
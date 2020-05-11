import * as child_process from 'child_process';
import * as fileSystem from 'fs';
import * as vscode from 'vscode';


const outputChannelName = "APK Lab";
const outputChannel = vscode.window.createOutputChannel(outputChannelName);

interface ProcessOptions {
    name: string;
    report: string;
    command: string;
    args: string[];
    onSuccess?: CallableFunction;
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
                    if (code === 0) {
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
        let apktoolPath = vscode.workspace.getConfiguration("apklab").get("apktoolPath");
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
        executeProcess({
            name: "Decoding", report: report, command: "java", args: args, onSuccess: () => {
                // open apkDecodeDir in vs code
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(apkDecodeDir));
            }
        });
    }

    export function rebuildAPK(apktoolYmlPath: string) {
        // get apktool path from settings
        let apktoolPath = vscode.workspace.getConfiguration("apklab").get("apktoolPath");
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
        executeProcess({
            name: "Rebuilding", report: report, command: "java", args: args, onSuccess: () => {
                // sign the APK
                apkSigner.signAPK(projectDir, apkFileName);
            }
        });
    }
}

export namespace apkSigner {

    export function signAPK(projectDir: string, apkFileName: string) {

        // get uber-apk-signer path from settings
        let apkSignerPath = vscode.workspace.getConfiguration("apklab").get("apkSignerPath");
        // check if it's not empty
        if (!apkSignerPath) {
            outputChannel.appendLine("Please download uber-apk-signer and update the apkSignerPath in settings.");
            vscode.window.showErrorMessage("uber-apk-signer not found");
            return;
        }
        const builtApkPath = `${projectDir}/dist/${apkFileName}`;
        // check if APK was rebuilt already and if not, return
        if (!fileSystem.existsSync(builtApkPath)) {
            outputChannel.appendLine("Please rebuild the APK before signing.");
            vscode.window.showWarningMessage("No APK build found in dist dir");
            return;
        }
        const report = `Signing ${apkFileName}...`;
        const args = ["-jar", String(apkSignerPath), '-a', builtApkPath, '--allowResign'];
        executeProcess({
            name: "Signing", report: report, command: "java", args: args
        });
    }
}
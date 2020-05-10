import * as child_process from 'child_process';
import * as fileSystem from 'fs';
import * as vscode from 'vscode';

// get correct apkFileName from apktool.yml from decoded app
function getApkName(apktoolYamlPath: string) {
    try {
        const fileContent = fileSystem.readFileSync(apktoolYamlPath);
        let regArr = /apkFileName: .*\.apk/.exec(String(fileContent));
        return regArr && regArr.length > 0 ? regArr[0].split(": ")[1] : "";
    } catch (err) {
        console.error("couldn't find apkFileName in apktool.yml: ", err);
        return "";
    }
}

export namespace apktool {

    export function decodeAPK(apkFilePath: string) {
        let apkFileName = apkFilePath.substring(apkFilePath.lastIndexOf('/') + 1);
        let apkName = apkFileName.split('.apk')[0];
        let apkDir = apkFilePath.split(apkFileName)[0];
        let apkDecodeDir = apkDir + apkName;
        while (fileSystem.existsSync(apkDecodeDir)) {
            apkDecodeDir = apkDecodeDir + "1";
        }
        // get apktool path from settings
        let apktoolPath = vscode.workspace.getConfiguration("apklab").get("apktoolPath");
        // check if it's not empty
        if (!apktoolPath) {
            console.error("Please download apktool and update the apktoolPath in settings.");
            vscode.window.showErrorMessage("Apktool not found");
            return;
        }
        // show a notification progress bar until the apk gets decoded
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "ApkTool",
                cancellable: true,
            },
            (progress, token) => {
                return new Promise((resolve) => {
                    console.info(`Decoding ${apkFileName} into ${apkDecodeDir}...`);
                    progress.report({ message: `Decoding ${apkFileName}...` });

                    let cp = child_process.spawn("java", ["-jar", String(apktoolPath), 'd', apkFilePath, '-o', apkDecodeDir], {});
                    cp.stdout.on('data', (data) => console.log(data.toString().trim()));
                    cp.stderr.on('data', (data) => console.error(data.toString().trim()));
                    cp.on('error', (data) => { console.error(data.toString().trim()); resolve(); });
                    cp.on('exit', (code) => {
                        if (code === 0) {
                            console.log("Decoding process was successful");
                            // open apkDecodeDir in vs code
                            vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(apkDecodeDir));
                        } else {
                            console.error(`Decoding process exited with code ${code}`);
                        }
                        resolve();
                    });
                    token.onCancellationRequested(() => {
                        console.warn("User canceled the decoding process");
                        if (!cp.killed) { cp.kill(); }
                    });
                });
            }
        );
    }

    export function rebuildAPK(apktoolYmlPath: string) {

        const apkFileName = getApkName(apktoolYmlPath);
        if (!apkFileName) { return; }

        const projectDir = apktoolYmlPath.split("/apktool.yml")[0];
        const projectName = projectDir.substring(projectDir.lastIndexOf("/") + 1);

        // get apktool path from settings
        let apktoolPath = vscode.workspace.getConfiguration("apklab").get("apktoolPath");
        // check if it's not empty
        if (!apktoolPath) {
            console.error("Please download apktool and update the apktoolPath in settings.");
            vscode.window.showErrorMessage("Apktool not found");
            return;
        }
        // show a notification progress bar until the apk is being rebuilt
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "ApkTool",
                cancellable: true,
            },
            (progress, token) => {
                return new Promise((resolve) => {
                    console.info(`Rebuilding ${apkFileName} into ${projectName}/dist/...`);
                    progress.report({ message: `Rebuilding ${apkFileName}...` });

                    let cp = child_process.spawn("java", ["-jar", String(apktoolPath), 'b', projectDir], {});
                    cp.stdout.on('data', (data) => console.log(data.toString().trim()));
                    cp.stderr.on('data', (data) => console.error(data.toString().trim()));
                    cp.on('error', (data) => { console.error(data.toString().trim()); resolve(); });
                    cp.on('exit', (code) => {
                        if (code === 0) {
                            console.log("Rebuilding apk was successful");
                            apkSigner.signAPK(projectDir, apkFileName);
                        } else {
                            console.error(`Rebuilding process exited with code ${code}`);
                        }
                        resolve();
                    });
                    token.onCancellationRequested(() => {
                        console.warn("User canceled the rebuilding process");
                        if (!cp.killed) { cp.kill(); }
                    });
                });
            }
        );
    }
}

export namespace apkSigner {

    export function signAPK(projectDir: string, apkFileName: string) {

        const builtApkPath = `${projectDir}/dist/${apkFileName}`;

        // check if APK was rebuilt already and if not, return
        if (!fileSystem.existsSync(builtApkPath)) {
            console.warn("Please rebuild the APK before signing.");
            vscode.window.showWarningMessage("No APK build found in dist dir");
            return;
        }

        // get uber-apk-signer path from settings
        let apkSignerPath = vscode.workspace.getConfiguration("apklab").get("apkSignerPath");
        // check if it's not empty
        if (!apkSignerPath) {
            console.error("Please download uber-apk-signer and update the apkSignerPath in settings.");
            vscode.window.showErrorMessage("uber-apk-signer not found");
            return;
        }
        // show a notification progress bar until the apk is being rebuilt
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "ApkSigner",
                cancellable: true,
            },
            (progress, token) => {
                return new Promise((resolve) => {
                    console.info(`Signing ${apkFileName}...`);
                    progress.report({ message: `Signing ${apkFileName}...` });

                    let cp = child_process.spawn("java", ["-jar", String(apkSignerPath), '-a', builtApkPath, '--allowResign'], {});
                    cp.stdout.on('data', (data) => console.log(data.toString().trim()));
                    cp.stderr.on('data', (data) => console.error(data.toString().trim()));
                    cp.on('error', (data) => { console.error(data.toString().trim()); resolve(); });
                    cp.on('exit', (code) => {
                        if (code === 0) {
                            console.log("Signing apk was successful");
                        } else {
                            console.error(`Signing process exited with code ${code}`);
                        }
                        resolve();
                    });
                    token.onCancellationRequested(() => {
                        console.warn("User canceled the signing process");
                        if (!cp.killed) { cp.kill(); }
                    });
                });
            }
        );
    }
}
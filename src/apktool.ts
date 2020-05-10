import * as child_process from 'child_process';
import * as fileSystem from 'fs';
import * as vscode from 'vscode';


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

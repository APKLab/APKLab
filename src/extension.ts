import * as vscode from "vscode";
import { adb, apktool } from "./tools";
import { outputChannel } from "./common";
import { updateTools } from "./downloader";
import { UI } from "./interface";
import { applyMitmPatches } from "./mitm-patches";

export function activate(context: vscode.ExtensionContext): void {
    console.log("Activated apklab extension!");

    // command for opening an apk file for decoding
    const openApkFileCommand = vscode.commands.registerCommand(
        "apklab.openApkFile",
        async () => {
            updateTools()
                .then(async () => {
                    UI.decompileAPK();
                })
                .catch(() => {
                    outputChannel.appendLine(
                        "Can't download/update dependencies!"
                    );
                });
        }
    );

    // command for rebuilding apk file
    const rebuildAPkFileCommand = vscode.commands.registerCommand(
        "apklab.rebuildApkFile",
        (uri: vscode.Uri) => {
            updateTools()
                .then(() => {
                    UI.rebuildAPK(uri.fsPath);
                })
                .catch(() => {
                    outputChannel.appendLine(
                        "Can't download/update dependencies!"
                    );
                });
        }
    );

    // command for installing apk file
    const installAPkFileCommand = vscode.commands.registerCommand(
        "apklab.installApkFile",
        (uri: vscode.Uri) => {
            adb.installAPK(uri.fsPath);
        }
    );

    // command for patching files for https inspection
    const patchApkForHttpsCommand = vscode.commands.registerCommand(
        "apklab.patchApkForHttps",
        (uri: vscode.Uri) => {
            updateTools()
                .then(() => {
                    applyMitmPatches(uri.fsPath);
                })
                .catch(() => {
                    outputChannel.appendLine(
                        "Can't download/update dependencies!"
                    );
                });
        }
    );

    // command to empty apktool framework resource dir
    const emptyFrameworkDirCommand = vscode.commands.registerCommand(
        "apklab.emptyFrameworkDir",
        () => {
            updateTools()
                .then(() => {
                    apktool.emptyFrameworkDir();
                })
                .catch(() => {
                    outputChannel.appendLine(
                        "Can't download/update dependencies!"
                    );
                });
        }
    );

    context.subscriptions.push(
        openApkFileCommand,
        rebuildAPkFileCommand,
        installAPkFileCommand,
        patchApkForHttpsCommand,
        emptyFrameworkDirCommand
    );
}

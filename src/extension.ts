import * as vscode from 'vscode';
import { apktool, adb } from './tools';
import { outputChannel } from './common';
import { updateTools } from './downloader';
import { UI } from './interface';


export function activate(context: vscode.ExtensionContext) {

	console.log('Activated apklab extension!');

	// command for opening an apk file for decoding
	const openApkFileCommand = vscode.commands.registerCommand('apklab.openApkFile', async () => {
		updateTools().then(async () => {
			UI.decompileAPK();
		}).catch(() => {
			outputChannel.appendLine("Can't download/update dependencies!");
		});
	});

	// command for rebuilding apk file
	const rebuildAPkFileCommand = vscode.commands.registerCommand("apklab.rebuildApkFile", (uri: vscode.Uri) => {
		updateTools().then(() => {
			UI.rebuildAPK(uri.fsPath);
		}).catch(() => {
			outputChannel.appendLine("Can't download/update dependencies!");
		});
	});

	// command for installing apk file
	const installAPkFileCommand = vscode.commands.registerCommand("apklab.installApkFile", (uri: vscode.Uri) => {
		adb.installAPK(uri.fsPath);
	});

	context.subscriptions.push(openApkFileCommand, rebuildAPkFileCommand, installAPkFileCommand);
}

export function deactivate() { }

import * as vscode from 'vscode';
import { apktool } from './tools';


export function activate(context: vscode.ExtensionContext) {

	console.log('Activated apklab extension!');
	// command for opening an apk file for decoding
	let openApkFileCommand = vscode.commands.registerCommand('apklab.openApkFile', async () => {

		let result = await vscode.window.showOpenDialog({
			canSelectFolders: false,
			filters: {
				APK: ["apk"]
			},
			openLabel: "Select an APK file",
		});
		if (result && result.length === 1) {
			apktool.decodeAPK(result[0].fsPath);
		} else {
			console.warn("[APKLAB]: no apk was file chosen");
		}
	});

	let rebuildAPkFileCommand = vscode.commands.registerCommand("apklab.rebuildApkFile", (uri: vscode.Uri) => {
		// rebuild apk using Apktool
		apktool.rebuildAPK(uri.fsPath);
	});

	context.subscriptions.push(openApkFileCommand, rebuildAPkFileCommand);
}

export function deactivate() { }

import * as vscode from 'vscode';
import * as apktool from './apktool';


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
			apktool.decodeAPK(result[0].path);
		} else {
			console.warn("[APKLAB]: no apk was file chosen");
		}
	});
	context.subscriptions.push(openApkFileCommand);
}

export function deactivate() { }

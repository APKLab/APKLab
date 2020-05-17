import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';


const outputChannelName = "APK Lab";
export const outputChannel = vscode.window.createOutputChannel(outputChannelName);
export const extensionConfig = vscode.workspace.getConfiguration("apklab");
export const apklabDataDir = path.join(os.homedir(), ".apklab");
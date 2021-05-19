import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

/**
 * Name of the OutputChannel for the extension.
 */
const outputChannelName = "APKLab";

/**
 * Output channel to write output data to.
 */
export const outputChannel =
    vscode.window.createOutputChannel(outputChannelName);

/**
 * Extension related configuration object name.
 */
export const extensionConfigName = "apklab";

/**
 * Data dir for the extension to download dependencies, etc.
 */
export const apklabDataDir = path.join(os.homedir(), ".apklab");

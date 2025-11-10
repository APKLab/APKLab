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

/**
 * URL to get the updater JSON data
 */
export const updaterConfigURL =
    "https://apklab.surendrajat.xyz/apklab_update_config.json";

/**
 * File extensions
 */
export const APK_FILE_EXTENSION = ".apk";
export const APKTOOL_YML_FILENAME = "apktool.yml";
export const QUARK_REPORT_FILENAME = "quarkReport.json";
export const JAVA_SOURCE_DIR = "java_src";
export const DIST_DIR = "dist";

/**
 * Time constants (in milliseconds)
 */
export const ONE_DAY_MS = 86400000;

/**
 * Quark analysis constants
 */
export const QUARK_HIGH_CONFIDENCE = "100%";

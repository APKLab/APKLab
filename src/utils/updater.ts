import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as config from "../data/config.json";
import { apklabDataDir, extensionConfigName } from "../data/constants";
import { apktool } from "../tools/apktool";
import { downloadTool } from "./downloader";

/**
 * Tool details for downloading it if it doesn't exist.
 */
export type Tool = {
    /**
     * Name of the tool.
     */
    name: string;
    /**
     * Latest supported version of the tool.
     */
    version: string;
    /**
     * Download URL.
     */
    downloadUrl: string;
    /**
     * Exact file name for downloaded tool.
     */
    fileName: string;
    /**
     * Name of the configuration related to the tool in extensionConfig object.
     */
    configName: string;
    /**
     * Is the downloaded file a zip file?
     */
    zipped: boolean;
    /**
     * If it's a zip file then where to extract it?
     */
    unzipDir?: string;
};

/**
 * Check the tools from `config.json`
 * If any tool does not exist or does not match given file name, download it.
 */
export async function updateTools(): Promise<void> {
    // create apklabDataDir if it doesn't exist
    if (!fs.existsSync(String(apklabDataDir))) {
        fs.mkdirSync(apklabDataDir);
    }
    // create first_run_completed file if it doesn't exist
    const firstRunFile = path.resolve(apklabDataDir, "first_run_completed");
    if (!fs.existsSync(firstRunFile)) {
        fs.writeFileSync(firstRunFile, "");
        return;
    }
    const extensionConfig =
        vscode.workspace.getConfiguration(extensionConfigName);
    if (!extensionConfig.get("updateTools")) return; // if updates are disabled, skip it

    const needsUpdate: Tool[] = [];
    config.tools.forEach((tool) => {
        const toolPath = extensionConfig.get(tool.configName);
        if (
            !toolPath ||
            !fs.existsSync(String(toolPath)) ||
            (!tool.zipped &&
                path.basename(String(toolPath)) !== tool.fileName) ||
            (tool.zipped && path.basename(String(toolPath)) !== tool.unzipDir)
        ) {
            needsUpdate.push(tool);
        }
    });

    if (needsUpdate.length > 0) {
        // show update notification
        vscode.window
            .showInformationMessage(
                "APKLab: Some of the tools can be updated to the latest version.",
                "Update tools",
                "Cancel"
            )
            .then(async (updateAction) => {
                if (updateAction == "Update tools") {
                    needsUpdate.forEach(async (tool) => {
                        // remove tool path from configuration & download it
                        vscode.workspace
                            .getConfiguration(extensionConfigName)
                            .update(
                                tool.configName,
                                "",
                                vscode.ConfigurationTarget.Global
                            )
                            .then(async () => {
                                await downloadTool(tool);
                            });
                    });
                }
            });
    }
}

/**
 * Check the tools from `config.json`
 * If any tool does not exist, download it.
 */
export function checkAndInstallTools(): Promise<void> {
    // TODO: Refactor without async promise
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<void>(async (resolve, reject) => {
        const extensionConfig =
            vscode.workspace.getConfiguration(extensionConfigName);
        await Promise.all(
            config.tools.map(async (tool) => {
                const toolPath = extensionConfig.get(tool.configName);
                if (!toolPath || !fs.existsSync(String(toolPath))) {
                    if (!fs.existsSync(String(apklabDataDir))) {
                        fs.mkdirSync(apklabDataDir);
                    }
                    const filepath = await downloadTool(tool);
                    if (!filepath) {
                        reject();
                    } else if (tool.name === "apktool") {
                        // remove old res framework on apktool install
                        await apktool.emptyFrameworkDir();
                    }
                }
            })
        );
        resolve();
    });
    // eslint-enable-next-line no-async-promise-executor
}

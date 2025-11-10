import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
    apklabDataDir,
    extensionConfigName,
    ONE_DAY_MS,
    outputChannel,
    updaterConfigURL,
} from "../data/constants";
import { apktool } from "../tools/apktool";
import { downloadFile, downloadTool } from "./downloader";

/**
 * Tool details for downloading it if it doesn't exist.
 */
export interface Tool {
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
}

/**
 * structure of update config data
 */
interface Config {
    tools: Tool[];
}

/**
 * Check the tools in update config
 * If any tool does not exist or does not match given file name, download it.
 */
export async function updateTools(): Promise<void> {
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

    const config = await getUpdateConfig();
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
                "APKLab: Some of the needed tools are missing or outdated.",
                "Update tools",
                "Cancel",
            )
            .then(async (updateAction) => {
                if (updateAction === "Update tools") {
                    // Use Promise.allSettled to properly handle async operations
                    const downloadPromises = needsUpdate.map(async (tool) => {
                        // remove tool path from configuration & download it
                        await vscode.workspace
                            .getConfiguration(extensionConfigName)
                            .update(
                                tool.configName,
                                "",
                                vscode.ConfigurationTarget.Global,
                            );
                        return await downloadTool(tool);
                    });

                    const results = await Promise.allSettled(downloadPromises);
                    const failures = results.filter(
                        (r) => r.status === "rejected",
                    );
                    if (failures.length > 0) {
                        outputChannel.appendLine(
                            `Failed to update ${failures.length} tool(s)`,
                        );
                    }
                }
            });
    }
}

/**
 * Check the tools in update config
 * If any tool does not exist, download it.
 */
export async function checkAndInstallTools(): Promise<void> {
    const extensionConfig =
        vscode.workspace.getConfiguration(extensionConfigName);
    const config = await getUpdateConfig();

    const results = await Promise.allSettled(
        config.tools.map(async (tool) => {
            const toolPath = extensionConfig.get(tool.configName);
            if (!toolPath || !fs.existsSync(String(toolPath))) {
                const filepath = await downloadTool(tool);
                if (!filepath) {
                    throw new Error(`Failed to download tool: ${tool.name}`);
                }
                if (tool.name === "apktool") {
                    // remove old res framework on apktool install
                    await apktool.emptyFrameworkDir();
                }
            }
        }),
    );

    // Check if any downloads failed
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
        const errors = failures
            .map((f) => (f as PromiseRejectedResult).reason)
            .join(", ");
        throw new Error(`Failed to install some tools: ${errors}`);
    }
}

/**
 * download the dynamic update data and save it locally.
 * refresh the local `config.json` file if it's older than 24h
 * @returns Config object with tools update data
 */
async function getUpdateConfig(): Promise<Config> {
    const configFile = path.resolve(apklabDataDir, "config.json");
    let configJsonData = { tools: [] };

    if (fs.existsSync(configFile)) {
        configJsonData = JSON.parse(fs.readFileSync(configFile, "utf-8"));
        if (Date.now() - fs.statSync(configFile).mtimeMs < ONE_DAY_MS) {
            return configJsonData;
        }
    }
    try {
        const buffer = await downloadFile(updaterConfigURL);
        const config = JSON.parse(Buffer.from(buffer).toString("utf-8"));
        if (config && config.tools) {
            fs.writeFileSync(configFile, buffer);
            return config;
        }
    } catch (err) {
        outputChannel.appendLine(`Failed to download update config: ${err}`);
    }

    return configJsonData;
}

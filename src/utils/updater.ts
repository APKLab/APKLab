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
 * The canonical on-disk location where a tool ends up after downloading:
 * the extraction dir for zipped tools, otherwise the downloaded file itself.
 */
function getToolInstallPath(tool: Tool): string {
    return path.join(
        apklabDataDir,
        tool.zipped && tool.unzipDir ? tool.unzipDir : tool.fileName,
    );
}

/**
 * Whether the exact version of `tool` is already present on disk, regardless
 * of what the extension config points at. Keying off the files (not the config
 * string) lets us self-heal when a previous download extracted successfully but
 * the config write never happened — the failure mode that made jadx re-download
 * on every launch. A genuine version bump changes the install path, so this
 * still returns false and triggers a fresh download.
 */
function isToolInstalled(tool: Tool): boolean {
    const installPath = getToolInstallPath(tool);
    if (!fs.existsSync(installPath)) return false;
    // a zipped tool is a dir; require it to be non-empty so a leftover empty
    // dir from a failed extraction doesn't masquerade as an installed tool
    if (tool.zipped && tool.unzipDir) {
        return fs.readdirSync(installPath).length > 0;
    }
    return true;
}

/**
 * Point the tool's config at its on-disk location if it isn't already, so the
 * rest of the extension (which reads the config, not the disk) stays in sync.
 */
async function syncToolConfig(tool: Tool): Promise<void> {
    const installPath = getToolInstallPath(tool);
    const current = vscode.workspace
        .getConfiguration(extensionConfigName)
        .get(tool.configName);
    if (current !== installPath) {
        await vscode.workspace
            .getConfiguration(extensionConfigName)
            .update(
                tool.configName,
                installPath,
                vscode.ConfigurationTarget.Global,
            );
    }
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
    for (const tool of config.tools) {
        if (isToolInstalled(tool)) {
            // present on disk: repair a missing/stale config value if needed
            await syncToolConfig(tool);
        } else {
            needsUpdate.push(tool);
        }
    }

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
                    const downloadPromises = needsUpdate.map((tool) =>
                        downloadTool(tool),
                    );

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
    try {
        const config = await getUpdateConfig();

        const results = await Promise.allSettled(
            config.tools.map(async (tool) => {
                if (isToolInstalled(tool)) {
                    // present on disk: repair a missing/stale config value
                    await syncToolConfig(tool);
                    return;
                }
                const filepath = await downloadTool(tool);
                if (!filepath) {
                    throw new Error(`Failed to download tool: ${tool.name}`);
                }
                if (tool.name === "apktool") {
                    // remove old res framework on apktool install
                    await apktool.emptyFrameworkDir();
                }
            }),
        );

        // Check if any downloads failed
        const failures = results.filter(
            (result) => result.status === "rejected",
        );
        if (failures.length > 0) {
            const errors = failures
                .map((f) => (f as PromiseRejectedResult).reason)
                .join(", ");
            outputChannel.appendLine(`Failed to install some tools: ${errors}`);
        }
    } catch (err) {
        outputChannel.appendLine(`Can't download/update dependencies: ${err}`);
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

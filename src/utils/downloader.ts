import { URL } from "url";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
// TODO: replace with another unzip library that has proper types
// eslint-disable-next-line @typescript-eslint/no-require-imports
import extract = require("extract-zip");
import {
    extensionConfigName,
    apklabDataDir,
    outputChannel,
} from "../data/constants";
import { Tool } from "./updater";

/**
 * Downloads and saves a Tool in apklabDataDir.
 * @param tool a Tool object.
 * @returns filePath for the tool if download was successful or null.
 */
export async function downloadTool(tool: Tool): Promise<string | null> {
    try {
        outputChannel.show();
        outputChannel.appendLine("-".repeat(50));
        outputChannel.appendLine(`Downloading file: ${tool.fileName}`);
        outputChannel.appendLine("-".repeat(50));
        const buffer = await downloadFile(tool.downloadUrl);
        const filePath = path.join(apklabDataDir, tool.fileName);
        fs.writeFileSync(filePath, buffer);
        let configPath = filePath;
        if (tool.zipped && tool.unzipDir) {
            configPath = path.join(apklabDataDir, tool.unzipDir);
            try {
                await extract(filePath, { dir: configPath });
                outputChannel.appendLine(
                    `Extracted ${filePath} into ${configPath}`,
                );
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : String(err);
                outputChannel.appendLine(
                    `Error: Extracting file ${filePath}: ${errorMessage}`,
                );
            }
        }
        await vscode.workspace
            .getConfiguration(extensionConfigName)
            .update(
                tool.configName,
                configPath,
                vscode.ConfigurationTarget.Global,
            );
        return filePath;
    } catch (error) {
        outputChannel.appendLine(`Error: ${error}`);
        return null;
    }
}

/**
 * Maximum number of redirects to follow
 */
const MAX_REDIRECTS = 5;

/**
 * Download file from a given URL.
 * @param urlString download URL for the file.
 * @param redirectCount current redirect count (for internal use).
 * @returns a Buffer of the file contents.
 */
export async function downloadFile(
    urlString: string,
    redirectCount = 0,
): Promise<Buffer> {
    if (redirectCount >= MAX_REDIRECTS) {
        throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
    }

    const buffers: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
        const request = https.request(new URL(urlString), (response) => {
            if (
                (response.statusCode === 301 || response.statusCode === 302) &&
                response.headers.location
            ) {
                // Redirect - download from new location
                return resolve(
                    downloadFile(response.headers.location, redirectCount + 1),
                );
            } else if (response.statusCode !== 200) {
                // Download failed - print error message
                const errorMsg = `Download failed with response code: ${response.statusCode}`;
                outputChannel.appendLine(errorMsg);
                reject(new Error(errorMsg));
            }

            // Downloading - hook up events
            const contentLength = response.headers["content-length"]
                ? response.headers["content-length"]
                : "0";
            const packageSize = parseInt(contentLength, 10);
            let downloadedBytes = 0;
            let downloadPercentage = 0;

            outputChannel.appendLine(
                `Download size: ${(packageSize / 1024 / 1024).toFixed(2)} MB`,
            );

            response.on("data", (data) => {
                downloadedBytes += data.length;
                buffers.push(data);

                // Update status bar item with percentage
                const newPercentage = Math.ceil(
                    100 * (downloadedBytes / packageSize),
                );
                if (newPercentage !== downloadPercentage) {
                    downloadPercentage = newPercentage;
                    outputChannel.appendLine(
                        `Downloaded ${downloadPercentage}%`,
                    );
                }
            });

            response.on("end", () => {
                resolve(Buffer.concat(buffers));
            });

            response.on("error", (err) => {
                reject(err.message);
            });
        });

        request.on("error", (err) => {
            reject(err.message);
        });

        // Execute the request
        request.end();
    });
}

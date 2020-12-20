import { parse as parseUrl } from 'url';
import * as https from 'https';
import * as vscode from 'vscode';
import { extensionConfigName, apklabDataDir, outputChannel } from './common';
import * as fs from 'fs';
import * as path from 'path';
import * as config from './config.json';
import * as extract from 'extract-zip';


/**
 * Tool details for downloading it if it doesn't exist.
 */
interface Tool {
    /**
     * Name of the tool.
     */
    name: string,
    /**
     * Latest supported version of the tool.
     */
    version: string,
    /**
     * Download URL.
     */
    downloadUrl: string,
    /**
     * Exact file name for downloaded tool.
     */
    fileName: string,
    /**
     * Name of the configuration related to the tool in extensionConfig object.
     */
    configName: string,
    /**
     * Is the downloaded file a zip file?
     */
    zipped: boolean,
    /**
     * If it's a zip file then where to extract it?
     */
    unzipDir?: string,
}

/**
 * Check the tools from `config.json`
 * If any tool does not exist, download it.
 */
export function updateTools() {
    return new Promise<void>(async (resolve, reject) => {
        const extensionConfig = vscode.workspace.getConfiguration(extensionConfigName);
        await Promise.all(config.tools.map(async (tool) => {
            const toolPath = extensionConfig.get(tool.configName);
            if (!toolPath || !fs.existsSync(String(toolPath))) {
                if (!fs.existsSync(String(apklabDataDir))) {
                    fs.mkdirSync(apklabDataDir);
                }
                const filepath = await DownloadFile(tool);
                if (!filepath) {
                    reject();
                }
            }
        }));
        resolve();
    });
}

/**
 * Downloads and saves a Tool in apklabDataDir.
 * @param tool a Tool object.
 * @returns filePath for the tool if download was successful or null.
 */
async function DownloadFile(tool: Tool) {
    try {
        outputChannel.show();
        outputChannel.appendLine(`Downloading file: ${tool.fileName}`);
        const buffer = await downloadFile(tool.downloadUrl);
        const filePath = path.join(apklabDataDir, tool.fileName);
        fs.writeFileSync(filePath, buffer);
        let configPath = filePath;
        if (tool.zipped && tool.unzipDir) {
            configPath = path.join(apklabDataDir, tool.unzipDir);
            try {
                await extract(filePath, { dir: configPath });
                outputChannel.appendLine(`Extracted ${filePath} into ${configPath}`);
            } catch (err) {
                outputChannel.appendLine(`Error: Extracting file ${filePath}: ${err.message}`);
            }
        }
        await vscode.workspace.getConfiguration(extensionConfigName).update(tool.configName, configPath, vscode.ConfigurationTarget.Global);
        return filePath;
    } catch (error) {
        outputChannel.appendLine(`Error: ${error}`);
        return null;
    }

}

/**
 * Download file from a given URL.
 * @param urlString download URL for the file.
 * @returns a Buffer of the file contents.
 */
async function downloadFile(urlString: string): Promise<Buffer> {
    const url = parseUrl(urlString);
    const config = vscode.workspace.getConfiguration();
    const strictSSL = config.get('http.proxyStrictSSL', true);
    const options: https.RequestOptions = {
        host: url.hostname,
        path: url.path,
        port: url.port,
        rejectUnauthorized: strictSSL
    };

    let buffers: any[] = [];

    return new Promise<Buffer>((resolve, reject) => {
        let request = https.request(options, response => {
            if ((response.statusCode === 301 || response.statusCode === 302) && response.headers.location) {
                // Redirect - download from new location
                return resolve(downloadFile(response.headers.location));
            }

            else if (response.statusCode !== 200) {
                // Download failed - print error message
                outputChannel.appendLine("Download failed with response code: " + response.statusCode);
                reject("Failed");
            }

            // Downloading - hook up events
            let contentLength = response.headers["content-length"] ? response.headers["content-length"] : "0";
            let packageSize = parseInt(contentLength, 10);
            let downloadedBytes = 0;
            let downloadPercentage = 0;

            outputChannel.appendLine(`Download size: ${(packageSize / 1024 / 1024).toFixed(2)} MB`);

            response.on('data', data => {
                downloadedBytes += data.length;
                buffers.push(data);

                // Update status bar item with percentage
                let newPercentage = Math.ceil(100 * (downloadedBytes / packageSize));
                if (newPercentage !== downloadPercentage) {
                    downloadPercentage = newPercentage;
                    outputChannel.appendLine(`Downloaded ${downloadPercentage}%`);
                }
            });

            response.on('end', () => {
                resolve(Buffer.concat(buffers));
            });

            response.on('error', err => {
                reject(err.message);
            });
        });

        request.on('error', err => {
            reject(err.message);
        });

        // Execute the request
        request.end();
    });
}

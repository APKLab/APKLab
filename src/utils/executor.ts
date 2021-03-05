import * as child_process from "child_process";
import * as fs from "fs";
import * as vscode from "vscode";
import { outputChannel } from "../data/constants";

/**
 * Options for executeProcess function.
 */
type ProcessOptions = {
    /**
     * Name of the process. Eg: `Decoding`.
     */
    name: string;
    /**
     * Report to show in progress bar.
     */
    report: string;
    /**
     * Name of the executable. Eg: `java`.
     */
    command: string;
    /**
     * CLI arguments for the command.
     */
    args: string[];
    /**
     * A file or dir which should exist if it was successful.
     */
    shouldExist?: string;
    /**
     * Callback on success.
     */
    onSuccess?: CallableFunction;
    /**
     * Execute command using shell
     */
    shell?: boolean;
};

/**
 * Executes a child_process and calls a callback if provided.
 * @param processOptions Takes a ProcessOptions type to process.
 */
export function executeProcess(processOptions: ProcessOptions): Thenable<void> {
    outputChannel.show();
    outputChannel.appendLine("-".repeat(processOptions.report.length));
    outputChannel.appendLine(processOptions.report);
    outputChannel.appendLine("-".repeat(processOptions.report.length));
    outputChannel.appendLine(
        `${processOptions.command} ${processOptions.args.join(" ")}`
    );

    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "APKLab",
            cancellable: true,
        },
        (progress, token) => {
            return new Promise<void>((resolve) => {
                progress.report({ message: processOptions.report });

                const cp = child_process.spawn(
                    processOptions.command,
                    processOptions.args,
                    {
                        shell: processOptions.shell,
                    }
                );
                cp.stdout.on("data", (data) =>
                    outputChannel.appendLine(data.toString().trim())
                );
                cp.stderr.on("data", (data) =>
                    outputChannel.appendLine(data.toString().trim())
                );
                cp.on("error", (data) => {
                    outputChannel.appendLine(data.toString().trim());
                    vscode.window.showErrorMessage(
                        `APKLab: ${processOptions.name} process failed.`
                    );
                    resolve();
                });
                cp.on("exit", async (code) => {
                    if (
                        code === 0 &&
                        (processOptions.shouldExist
                            ? fs.existsSync(processOptions.shouldExist)
                            : true)
                    ) {
                        outputChannel.appendLine(
                            `${processOptions.name} process was successful`
                        );
                        vscode.window.showInformationMessage(
                            `APKLab: ${processOptions.name} process was successful.`
                        );
                        if (processOptions.onSuccess) {
                            await processOptions.onSuccess();
                        }
                    } else {
                        outputChannel.appendLine(
                            `${processOptions.name} process exited with code ${code}`
                        );
                        vscode.window.showErrorMessage(
                            `APKLab: ${processOptions.name} process failed.`
                        );
                    }
                    resolve();
                });
                token.onCancellationRequested(() => {
                    outputChannel.appendLine(
                        `User canceled the ${processOptions.name} process`
                    );
                    if (!cp.killed) {
                        cp.kill();
                    }
                });
            });
        }
    );
}

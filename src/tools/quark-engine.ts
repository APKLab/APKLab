import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as child_process from "child_process";
import * as vscode from "vscode";
import * as glob from "glob";
import { outputChannel } from "../data/constants";
import { quarkSummaryReportHTML } from "../utils/quark-html";
import { executeProcess } from "../utils/executor";

/**
 * Read and parse the JSON file of quark analysis report.
 * @param reportPath The path of the `quarkReport.json` file.
 * @returns return parsed report data.
 */
function parseReport(reportPath: string) {
    const quarkReportJSON: any = JSON.parse(
        fs.readFileSync(reportPath, "utf8")
    );
    const crimes = quarkReportJSON.crimes;

    const report: { [key: string]: any } = {};

    for (let crimeIndex = 0; crimeIndex < crimes.length; crimeIndex++) {
        const crimeObj = crimes[crimeIndex];
        const crimeId = `c${crimeIndex}`;

        if (crimeObj.confidence == "100%") {
            const newFunctionObj: { [key: string]: any } = {};

            for (
                let functionIndex = 0;
                functionIndex < crimeObj.register.length;
                functionIndex++
            ) {
                const functionObj = crimeObj.register[functionIndex];
                const [items] = Object.entries(functionObj);
                const parentFunction: string[] = items[0].split(" ");
                const apiCalls: any = items[1];

                const parentClassName = parentFunction[0].replace(";", "");
                delete parentFunction[0];
                const parentMethodName: string = parentFunction.join("");
                const functionId = `${crimeId}-f${functionIndex}`;

                newFunctionObj[functionId] = {
                    function: {
                        class: parentClassName,
                        method: parentMethodName,
                    },
                    apis: [apiCalls["first"], apiCalls["second"]],
                };
            }

            report[crimeId] = {
                crime: crimeObj.crime,
                score: crimeObj.score,
                weight: crimeObj.weight,
                confidence: crimeObj.confidence,
                api_call: newFunctionObj,
            };
        }
    }
    return report;
}

/**
 * Convert function name to the path of the source code file.
 * @param func The string of function name.
 * @return The path of the source code file.
 */
function functionToPath(srcDir: string, func: any): string {
    outputChannel.appendLine(`Searching smali file: ${func.class}`);
    let srcPath = glob.sync(`${srcDir}/smali*/${func.class}.smali`, {});

    if (func.class[0] == "L") {
        srcPath = glob.sync(
            `${srcDir}/smali*/${func.class.substring(1)}.smali`,
            {}
        );
    }
    return srcPath[0];
}

/**
 * Find a specific function in the segment of the given text document.
 * @param doc The text document from source code file.
 * @param functionName a string of the function name
 * @return The function start-line and end-line, return false if not found.
 */
function searchFunctionSegment(
    doc: vscode.TextDocument,
    functionName: string
): Array<number> | false {
    const lineCount = doc.lineCount;
    let foundMethod = false;

    let startLine = -1;
    let endLine = -1;

    for (let lineNumber = 0; lineNumber < lineCount; lineNumber++) {
        const lineText = doc.lineAt(lineNumber);

        if (
            lineText.text.includes(functionName) &&
            lineText.text.includes(".method")
        ) {
            startLine = lineNumber;
            foundMethod = true;
        }

        if (foundMethod && lineText.text.includes(".end method")) {
            endLine = lineNumber;
            foundMethod = false;
        }
    }
    if ((startLine == -1 && endLine == -1) || startLine >= endLine) {
        return false;
    }

    return [startLine, endLine];
}

/**
 * Search the position where API called in the given document segment.
 * @param doc the text document from source code file.
 * @param apis The list of Smali code that call native API.
 * @param seg The searching segment [start-line, end-line], if null then search the whole document.
 * @returns the position where API called, return false if not found.
 */
function getApiCallPosition(
    doc: vscode.TextDocument,
    api: Array<any>,
    seg: number[] | null
): vscode.Position | false {
    if (seg == null) {
        seg = [0, doc.lineCount];
    }

    // remove space in string
    const bytecode = String(api[0]).replace(/\s/g, "");
    const method = String(api[api.length - 1]).replace(/\s/g, "");

    for (let lineNumber = seg[0]; lineNumber < seg[1]; lineNumber++) {
        const lineText = doc.lineAt(lineNumber);

        if (
            lineText.text.includes(bytecode) &&
            lineText.text.includes(method)
        ) {
            return lineText.range.start;
        }
    }
    return false;
}

/**
 * Search and highlight where APIs called in source code.
 * @param projectDir project output dir for decode/decompile/analysis.
 * @param parentFunction The data of parent function where APIs called from.
 * @param apiCalls The smali code that executes native APIs.
 */
function navigateSourceCode(
    projectDir: string,
    parentFunction: any,
    apiCalls: Array<any>
) {
    const smaliPath = functionToPath(projectDir, parentFunction);
    vscode.workspace.openTextDocument(smaliPath).then((doc) => {
        vscode.window.showTextDocument(doc, vscode.ViewColumn.One).then((e) => {
            const parentDecorationsArray: vscode.DecorationOptions[] = [];
            const apiDecorationsArray: vscode.DecorationOptions[] = [];

            const mdSegment: number[] | false = searchFunctionSegment(
                doc,
                parentFunction.method
            );
            if (!mdSegment) {
                vscode.window.showErrorMessage(
                    "APKLab: Cannot find the parent function in source code!"
                );
                return;
            }
            const parentFunctionPosition = new vscode.Position(mdSegment[0], 0);

            const fstApi: vscode.Position | false = getApiCallPosition(
                doc,
                apiCalls[0],
                mdSegment
            );
            const secApi: vscode.Position | false = getApiCallPosition(
                doc,
                apiCalls[1],
                mdSegment
            );

            if (!fstApi || !secApi) {
                vscode.window.showErrorMessage(
                    "Cannot find the APIs call in source code!"
                );
                return;
            }

            const fstApiDecoration = {
                range: new vscode.Range(fstApi, fstApi),
            };
            const secApiDecoration = {
                range: new vscode.Range(secApi, secApi),
            };
            apiDecorationsArray.push(fstApiDecoration);
            apiDecorationsArray.push(secApiDecoration);

            const methodSegmentDecoration = {
                range: new vscode.Range(
                    new vscode.Position(mdSegment[0], 0),
                    new vscode.Position(mdSegment[1], 0)
                ),
            };
            parentDecorationsArray.push(methodSegmentDecoration);

            const parentDecorationType =
                vscode.window.createTextEditorDecorationType({
                    isWholeLine: true,
                    dark: {
                        backgroundColor: "#193435",
                    },
                    light: {
                        backgroundColor: "#dcfddc",
                    },
                });
            const apiDecorationType =
                vscode.window.createTextEditorDecorationType({
                    fontWeight: "bold",
                    isWholeLine: true,
                    dark: {
                        backgroundColor: "#5b2334",
                    },
                    light: {
                        backgroundColor: "#ffc2c3",
                    },
                });

            e.setDecorations(parentDecorationType, parentDecorationsArray);
            e.setDecorations(apiDecorationType, apiDecorationsArray);

            e.selection = new vscode.Selection(
                parentFunctionPosition,
                parentFunctionPosition
            );

            vscode.commands.executeCommand("revealLine", {
                lineNumber: mdSegment[0],
                at: "top",
            });
        });
    });
}

export namespace Quark {
    /**
     * Check if Quark are installed
     * @return if quark installed or not
     */
    export function checkQuarkInstalled(): boolean {
        const cmd = `cd ${path.join(os.homedir(), ".quark-engine")} ; quark`;

        outputChannel.appendLine(`exec: ${cmd}`);

        try {
            child_process.execSync(cmd);
            return true;
        } catch (error) {
            outputChannel.appendLine(`Caught error from Quark install check`);
            outputChannel.append(String(error));
            return false;
        }
    }

    /**
     * Analyzing APK using Quark-Engine.
     * @param apkFilePath The path of APK file.
     * @param projectDir project output dir for decode/decompile/analysis.
     */
    export async function analyzeAPK(
        apkFilePath: string,
        projectDir: string
    ): Promise<void> {
        const jsonReportPath = path.join(projectDir, `quarkReport.json`);
        const projectQuarkDir = path.join(projectDir, `quark`);

        if (!fs.existsSync(projectQuarkDir)) {
            fs.mkdirSync(projectQuarkDir);
        }

        const cmd = `cd ${projectQuarkDir} ; quark`;
        await executeProcess({
            name: "Quark analysis",
            report: `Analyzing ${apkFilePath}`,
            command: cmd,
            args: ["-a", apkFilePath, "-s", "-c", "-o", jsonReportPath],
            shell: true,
        });
    }

    export async function showTreeMap(projectDir: string): Promise<void> {
        const treeMapPath = path.join(
            projectDir,
            `quark`,
            `rules_classification.png`
        );

        if (!fs.existsSync(treeMapPath)) {
            vscode.window.showErrorMessage(
                "APKLab: The tree map file doesn't exist!"
            );
            return;
        }
        const uri = vscode.Uri.file(treeMapPath);
        await vscode.commands.executeCommand(
            "vscode.open",
            uri,
            vscode.ViewColumn.One
        );
    }

    /**
     * Show Quark APK analysis report in WebView panel.
     * @param reportPath the path of the `quarkReport.json` file.
     */
    export async function showSummaryReport(reportPath: string): Promise<void> {
        const projectDir = path.dirname(reportPath);
        const report: { [key: string]: any } = parseReport(reportPath);

        await vscode.commands.executeCommand(
            "workbench.action.editorLayoutTwoColumns"
        );

        const panel = vscode.window.createWebviewPanel(
            "quark summary report",
            "Quark Summary Report",
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
            }
        );

        panel.webview.html = quarkSummaryReportHTML(report);
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case "navigate":
                    navigateSourceCode(
                        projectDir,
                        report[message.cid]["api_call"][message.functionId][
                            "function"
                        ],
                        report[message.cid]["api_call"][message.functionId][
                            "apis"
                        ]
                    );
                    break;
                case "treemap":
                    showTreeMap(projectDir);
            }
        });
    }
}

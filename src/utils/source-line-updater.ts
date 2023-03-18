import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
    copyDirectory,
    getFullBaseName,
    stripLeadingDir,
} from "./directory-utils";

class SourceSmaliMapping {
    sourceFile: string;
    smaliFile: string;
    lineMap: Map<number, number>;

    constructor(
        sourceFile: string,
        smaliFile: string,
        lineMap: Map<number, number>
    ) {
        this.sourceFile = sourceFile;
        this.smaliFile = smaliFile;
        this.lineMap = lineMap;
    }

    public async updateSmaliFileLines(projectDir: string, newDir: string) {
        await replaceLineNumbersInSmaliFile(
            this.smaliFile,
            this.lineMap,
            projectDir,
            newDir
        );
    }
}

export async function updateSmaliDebugLines(
    apktoolYmlPath: string,
    progress: vscode.Progress<{
        message?: string | undefined;
        increment?: number | undefined;
    }>
): Promise<void> {
    progress.report({ increment: 0, message: "Starting smali mapping" });

    const projectDir = path.parse(apktoolYmlPath).dir;
    const sourceDir = path.join(projectDir, "java_src");

    if (!fs.existsSync(sourceDir)) {
        vscode.window.showErrorMessage(
            "Java source file directory is not present, source files are compiled with sourcelines"
        );
        return;
    }

    const originSmaliDir = path.join(projectDir, "orig_smali");
    const newSmaliDir = projectDir;

    progress.report({ increment: 1, message: "Backing up original smalis" });

    backupOrigSmalis(projectDir, originSmaliDir);

    const sourceFiles = collectFilesWithExtension(sourceDir, "java");
    const smaliFiles = collectFilesWithExtension(originSmaliDir, "smali");

    progress.report({ increment: 5, message: "Getting linemappings" });

    const sourceFileMappings = await collectSmaliFilesPairsForSourceFilesList(
        sourceFiles,
        smaliFiles,
        sourceDir,
        originSmaliDir
    );

    progress.report({
        increment: 10,
        message: "Updating smali line info from mappings",
    });

    let progressInt = 1;
    const total = sourceFileMappings.length;
    const interval = 1000;

    const incAmount = 84 / (total / interval);

    for (const sourceFileMapping of sourceFileMappings) {
        if (progressInt % interval === 0) {
            progress.report({
                increment: incAmount,
                message: `Writing smalis: ${progressInt} out of ${total}`,
            });
        }
        progressInt++;
        await sourceFileMapping.updateSmaliFileLines(
            originSmaliDir,
            newSmaliDir
        );
    }
}

async function replaceLineNumbersInSmaliFile(
    smaliFile: string,
    lineMap: Map<number, number>,
    projectDir: string,
    newDir: string
) {
    try {
        const fileContent = await fs.promises.readFile(smaliFile, {
            encoding: "utf-8",
        });
        const lines = fileContent.split("\n");
        let lastMatch = 1;
        const updatedLines = lines.map((line) => {
            const match = line.match(/\.line (\d+)/);

            if (match) {
                const lineNumber = parseInt(match[1], 10);

                if (lineMap.has(lineNumber)) {
                    const newLineNumber = lineMap.get(lineNumber);
                    lastMatch = newLineNumber as number;

                    return line.replace(match[0], `.line ${newLineNumber}`);
                } else {
                    return line.replace(match[0], `.line ${lastMatch}`);
                }
            }
            return line;
        });

        const updatedContent = updatedLines.join("\n");

        const outpath = smaliFile.replace(projectDir, newDir);
        const outDirPath = path.dirname(outpath);
        if (!fs.existsSync(outDirPath)) {
            fs.mkdirSync(outDirPath, { recursive: true });
        }

        await fs.promises.writeFile(outpath, updatedContent, {
            encoding: "utf-8",
        });
    } catch (error) {
        console.error(`Error processing file: ${(error as Error).message}`);
    }
}

async function parseLineMapFromSourceFile(
    sourceFile: string
): Promise<Map<number, number>> {
    const lineMap = new Map();
    let sourceLine = 0;
    try {
        const fileContent = await fs.promises.readFile(sourceFile, {
            encoding: "utf-8",
        });
        const lines = fileContent.split("\n");

        for (const line of lines) {
            sourceLine++;
            const match = line.match(/^\/\* (\d+) \*\//);

            if (match) {
                const annotatedLineNumber = parseInt(match[1], 10);
                lineMap.set(annotatedLineNumber, sourceLine);
            }
        }
    } catch (err) {
        console.error(`error on line ${sourceLine}`);
        console.error(`Error processing file: ${(err as Error).message}`);
    }

    return lineMap;
}

function collectFilesWithExtension(
    directory: string,
    extension: string
): string[] {
    return fs.readdirSync(directory).flatMap((file: string) => {
        const absolutePath = path.join(directory, file);

        if (absolutePath.startsWith(".")) {
            return [];
        }

        if (fs.statSync(absolutePath).isDirectory()) {
            return collectFilesWithExtension(absolutePath, extension);
        } else {
            return absolutePath.split(".").pop() === extension
                ? [absolutePath]
                : [];
        }
    });
}

async function collectSmaliFilesPairsForSourceFilesList(
    sourceFiles: string[],
    smaliFiles: string[],
    javaSrcDir: string,
    smaliDir: string
): Promise<SourceSmaliMapping[]> {
    const smaliMap = new Map<string, string>();

    for (const smaliFile of smaliFiles) {
        const smaliPath = getFullBaseName(smaliFile, smaliDir);
        const baseName = stripLeadingDir(smaliPath);

        if (smaliMap.has(baseName)) {
            console.log("dup smali, this should never happen");
        } else {
            smaliMap.set(baseName, smaliFile);
        }
    }

    const sourceSmaliMappingArray: SourceSmaliMapping[] = [];
    for (const sourceFile of sourceFiles) {
        const javaFileName = getFullBaseName(sourceFile, javaSrcDir);

        if (smaliMap.has(javaFileName)) {
            const relatedSmaliFile = smaliMap.get(javaFileName) as string;
            const lineMap = await parseLineMapFromSourceFile(sourceFile);
            sourceSmaliMappingArray.push(
                new SourceSmaliMapping(sourceFile, relatedSmaliFile, lineMap)
            );
        }
    }
    return sourceSmaliMappingArray;
}

function backupOrigSmalis(projectDir: string, originSmaliDir: string) {
    if (!fs.existsSync(originSmaliDir)) {
        fs.mkdirSync(originSmaliDir);

        for (const directory of fs.readdirSync(projectDir)) {
            if (directory.startsWith("smali")) {
                const srcDir = path.join(projectDir, directory);
                const destDir = path.join(originSmaliDir, directory);
                copyDirectory(srcDir, destDir);
            }
        }
    }
}

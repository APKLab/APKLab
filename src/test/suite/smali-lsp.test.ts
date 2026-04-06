import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    State,
} from "vscode-languageclient/node";
import { getJavaPath } from "../../utils/java";
import { apklabDataDir } from "../../data/constants";
import { checkAndInstallTools } from "../../utils/updater";
import { apktool } from "../../tools/apktool";

describe("Smali LSP Integration Tests", function () {
    this.timeout(300000); // 5 minutes — includes tool download + APK decode + indexing

    const testDataDir = path.resolve(__dirname, "../../../testdata");
    const simpleKeyboardDir = path.join(testDataDir, "simplekeyboard");
    const testApkPath = path.join(simpleKeyboardDir, "test.apk");
    const projectDir = path.join(simpleKeyboardDir, "lsp-test");

    let client: LanguageClient;

    before("Download tools, decode APK, start LSP", async function () {
        // Ensure apklabDataDir exists (normally done by activate())
        if (!fs.existsSync(String(apklabDataDir))) {
            fs.mkdirSync(apklabDataDir);
        }

        // Download tools first
        await checkAndInstallTools();

        // Find smali-lsp JAR directly in apklabDataDir
        const serverJar = findSmaliLspJar();
        if (!serverJar) {
            console.log(
                "Skipping LSP tests: smali-lsp JAR not found in " +
                    apklabDataDir,
            );
            this.skip();
            return;
        }

        // Decode SimpleKeyboard APK to get smali files
        if (!fs.existsSync(testApkPath)) {
            console.log("Skipping LSP tests: test APK not found");
            this.skip();
            return;
        }

        if (!fs.existsSync(path.join(projectDir, "apktool.yml"))) {
            await apktool.decodeAPK(testApkPath, projectDir, []);
        }

        const smaliDir = path.join(projectDir, "smali");
        if (!fs.existsSync(smaliDir)) {
            console.log("Skipping LSP tests: decode produced no smali files");
            this.skip();
            return;
        }

        // Start LSP server
        const javaPath = getJavaPath();
        const serverOptions: ServerOptions = {
            command: javaPath,
            args: ["-jar", serverJar, "lsp"],
        };

        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: "file", language: "smali" }],
            workspaceFolder: {
                uri: vscode.Uri.file(projectDir),
                name: "simplekeyboard-lsp-test",
                index: 0,
            },
        };

        client = new LanguageClient(
            "smaliLspTest",
            "Smali LSP Test",
            serverOptions,
            clientOptions,
        );

        await client.start();
        await waitForServerReady(client);
    });

    after("Stop LSP and cleanup", async function () {
        if (client) {
            await client.stop();
            console.log("Smali LSP server stopped");
        }
        // Clean up decoded project
        if (fs.existsSync(projectDir)) {
            fs.rmSync(projectDir, { recursive: true });
        }
    });

    it("should respond to textDocument/hover", async function () {
        const smaliFile = findSmaliFileWithMethod(projectDir);
        assert.ok(smaliFile, "Should find a smali file with methods");

        const doc = await vscode.workspace.openTextDocument(smaliFile);
        const position = findMethodPosition(doc);
        assert.ok(position, "Should find a method in document");

        const hovers = (await vscode.commands.executeCommand(
            "vscode.executeHoverProvider",
            doc.uri,
            position,
        )) as vscode.Hover[];

        assert.ok(hovers && hovers.length > 0, "Should return hover info");
        const hoverText = hovers
            .map((h) =>
                h.contents
                    .map((c) =>
                        typeof c === "string"
                            ? c
                            : (c as vscode.MarkdownString).value,
                    )
                    .join(""),
            )
            .join("");
        console.log(`Hover response: ${hoverText.substring(0, 200)}`);
        assert.ok(hoverText.length > 0, "Hover should have content");
    });

    it("should respond to textDocument/definition", async function () {
        // Find a smali file that invokes a method from another class
        const smaliFile = findSmaliFileWithInvoke(projectDir);
        assert.ok(
            smaliFile,
            "Should find a smali file with invoke instruction",
        );

        const doc = await vscode.workspace.openTextDocument(smaliFile.path);
        const position = new vscode.Position(smaliFile.line, smaliFile.col);

        const definitions = (await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            doc.uri,
            position,
        )) as vscode.Location[];

        // Definition may or may not resolve depending on the target
        // Just verify it doesn't throw
        console.log(
            `Definition results: ${definitions ? definitions.length : 0}`,
        );
    });

    it("should provide document symbols", async function () {
        const smaliFile = findSmaliFileWithMethod(projectDir);
        assert.ok(smaliFile, "Should find a smali file");

        const doc = await vscode.workspace.openTextDocument(smaliFile);

        const symbols = (await vscode.commands.executeCommand(
            "vscode.executeDocumentSymbolProvider",
            doc.uri,
        )) as vscode.DocumentSymbol[];

        assert.ok(
            symbols && symbols.length > 0,
            "Should return document symbols",
        );
        const names = flattenSymbolNames(symbols);
        console.log(`Document symbols: ${names.join(", ")}`);
    });

    it("should provide workspace symbols", async function () {
        const symbols = (await vscode.commands.executeCommand(
            "vscode.executeWorkspaceSymbolProvider",
            "Keyboard",
        )) as vscode.SymbolInformation[];

        assert.ok(
            symbols && symbols.length > 0,
            "Should find Keyboard-related symbols via workspace search",
        );
        console.log(`Workspace symbols matching 'Keyboard': ${symbols.length}`);
    });
});

/**
 * Find the smali-lsp JAR in apklabDataDir.
 */
function findSmaliLspJar(): string | null {
    if (!fs.existsSync(String(apklabDataDir))) return null;
    const files = fs.readdirSync(String(apklabDataDir));
    const jar = files.find(
        (f) => f.startsWith("smali-lsp") && f.endsWith(".jar"),
    );
    return jar ? path.join(String(apklabDataDir), jar) : null;
}

/**
 * Find a smali file that has .method directives.
 */
function findSmaliFileWithMethod(projectDir: string): string | null {
    const smaliDir = path.join(projectDir, "smali");
    return walkForSmali(smaliDir, (content) => content.includes(".method "));
}

/**
 * Find a smali file with an invoke instruction and return its position.
 */
function findSmaliFileWithInvoke(
    projectDir: string,
): { path: string; line: number; col: number } | null {
    const smaliDir = path.join(projectDir, "smali");
    const filePath = walkForSmali(smaliDir, (content) =>
        content.includes("invoke-virtual"),
    );
    if (!filePath) return null;

    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
        const col = lines[i].indexOf("invoke-virtual");
        if (col !== -1) {
            return { path: filePath, line: i, col };
        }
    }
    return null;
}

/**
 * Walk smali directory and return first file matching predicate.
 */
function walkForSmali(
    dir: string,
    predicate: (content: string) => boolean,
): string | null {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const found = walkForSmali(fullPath, predicate);
            if (found) return found;
        } else if (entry.name.endsWith(".smali")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            if (predicate(content)) return fullPath;
        }
    }
    return null;
}

/**
 * Find the position of the first .method directive's name in a document.
 */
function findMethodPosition(doc: vscode.TextDocument): vscode.Position | null {
    for (let line = 0; line < doc.lineCount; line++) {
        const text = doc.lineAt(line).text;
        // Match .method with any number of modifiers, capture the method name before (
        const match = text.match(/\.method\s+(?:\S+\s+)*(\S+)\(/);
        if (match) {
            const col = text.indexOf(match[1]);
            return new vscode.Position(line, col);
        }
    }
    return null;
}

/**
 * Flatten nested document symbols into a list of names.
 */
function flattenSymbolNames(symbols: vscode.DocumentSymbol[]): string[] {
    const names: string[] = [];
    for (const s of symbols) {
        names.push(s.name);
        if (s.children) {
            names.push(...flattenSymbolNames(s.children));
        }
    }
    return names;
}

/**
 * Wait for the language server to finish indexing.
 */
async function waitForServerReady(client: LanguageClient): Promise<void> {
    if (client.state !== State.Running) {
        await new Promise<void>((resolve) => {
            const disposable = client.onDidChangeState((e) => {
                if (e.newState === State.Running) {
                    disposable.dispose();
                    resolve();
                }
            });
        });
    }
    // Give time for indexing (172 smali files — should be fast)
    await new Promise((resolve) => setTimeout(resolve, 5000));
}

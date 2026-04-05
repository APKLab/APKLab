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
import { checkAndInstallTools } from "../../utils/updater";

describe("Smali LSP Integration Tests", function () {
    this.timeout(120000);

    const testProjectDir = path.resolve(
        __dirname,
        "../../../testdata/smali-lsp-test",
    );
    const mainActivityPath = path.join(
        testProjectDir,
        "smali/com/test/MainActivity.smali",
    );
    const helperPath = path.join(
        testProjectDir,
        "smali/com/test/Helper.smali",
    );

    let client: LanguageClient;

    before("Start smali-lsp server", async function () {
        assert.ok(
            fs.existsSync(mainActivityPath),
            `Test file missing: ${mainActivityPath}`,
        );
        assert.ok(
            fs.existsSync(helperPath),
            `Test file missing: ${helperPath}`,
        );

        await checkAndInstallTools();

        const config = vscode.workspace.getConfiguration("apklab");
        const serverJar = config.get<string>("smaliLspPath");
        if (!serverJar || !fs.existsSync(serverJar)) {
            console.log("Skipping LSP tests: server JAR not available");
            this.skip();
            return;
        }

        const javaPath = getJavaPath();
        const serverOptions: ServerOptions = {
            command: javaPath,
            args: ["-jar", serverJar, "lsp"],
        };

        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: "file", language: "smali" }],
            workspaceFolder: {
                uri: vscode.Uri.file(testProjectDir),
                name: "smali-lsp-test",
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

    after("Stop smali-lsp server", async function () {
        if (client) {
            await client.stop();
            console.log("Smali LSP server stopped");
        }
    });

    it("should respond to textDocument/hover", async function () {
        const doc = await vscode.workspace.openTextDocument(mainActivityPath);
        // Hover over "getName" in the method definition (line 12, col ~20)
        const position = findPosition(doc, "getName");
        assert.ok(position, "Should find 'getName' in document");

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
        // Open Helper.smali which references MainActivity.getName()
        const doc = await vscode.workspace.openTextDocument(helperPath);
        // Find the reference to getName in Helper.smali
        const position = findPosition(doc, "getName");
        assert.ok(position, "Should find 'getName' reference in Helper");

        const definitions = (await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            doc.uri,
            position,
        )) as vscode.Location[];

        assert.ok(
            definitions && definitions.length > 0,
            "Should return definition location",
        );
        console.log(
            `Definition: ${definitions[0].uri.fsPath}:${definitions[0].range.start.line}`,
        );
    });

    it("should respond to textDocument/references", async function () {
        const doc = await vscode.workspace.openTextDocument(mainActivityPath);
        // Find references to getName method
        const position = findPosition(doc, "getName");
        assert.ok(position, "Should find 'getName' in document");

        const references = (await vscode.commands.executeCommand(
            "vscode.executeReferenceProvider",
            doc.uri,
            position,
        )) as vscode.Location[];

        assert.ok(
            references && references.length > 0,
            "Should find at least one reference",
        );
        console.log(`Found ${references.length} reference(s) to getName`);
        // getName is called in MainActivity.toString and Helper.greet
        // plus its own definition
    });

    it("should provide document symbols", async function () {
        const doc = await vscode.workspace.openTextDocument(mainActivityPath);

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
        // Should contain class name and methods
    });

    it("should provide workspace symbols", async function () {
        const symbols = (await vscode.commands.executeCommand(
            "vscode.executeWorkspaceSymbolProvider",
            "MainActivity",
        )) as vscode.SymbolInformation[];

        assert.ok(
            symbols && symbols.length > 0,
            "Should find MainActivity via workspace symbols",
        );
        console.log(
            `Workspace symbols matching 'MainActivity': ${symbols.length}`,
        );
    });
});

/**
 * Find the position of a string in a document, positioned at the start of the match.
 */
function findPosition(
    doc: vscode.TextDocument,
    needle: string,
): vscode.Position | null {
    for (let line = 0; line < doc.lineCount; line++) {
        const col = doc.lineAt(line).text.indexOf(needle);
        if (col !== -1) {
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
 * Polls until the server is in Running state and gives time for initial indexing.
 */
async function waitForServerReady(
    client: LanguageClient,
): Promise<void> {
    // Wait for running state
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
    // Give the server time to index the small test workspace
    await new Promise((resolve) => setTimeout(resolve, 3000));
}

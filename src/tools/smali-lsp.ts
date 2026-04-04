import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { workspace, window, Uri, TextDocument, ExtensionContext } from "vscode";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
} from "vscode-languageclient/node";
import {
    extensionConfigName,
    outputChannel,
    APKTOOL_YML_FILENAME,
} from "../data/constants";

let client: LanguageClient | undefined;

/**
 * Find the APKTool project root by walking up from the given directory.
 * An APKTool project is identified by the presence of apktool.yml.
 */
function findApktoolProjectRoot(startPath: string): string | null {
    let dir = startPath;
    for (let i = 0; i < 10; i++) {
        if (fs.existsSync(path.join(dir, APKTOOL_YML_FILENAME))) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

/**
 * Check if Java 17+ is available. Returns the version number or null.
 */
function checkJavaVersion(javaPath: string): number | null {
    try {
        const output = child_process.execFileSync(javaPath, ["-version"], {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 5000,
        });
        // java -version outputs to stderr, but execFileSync with encoding
        // captures both. Try matching from combined output.
        const combined = output || "";
        const match = combined.match(/version "(\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        }
    } catch (err) {
        // java -version writes to stderr; try to capture from error
        if (err && typeof err === "object" && "stderr" in err) {
            const stderr = String((err as { stderr: unknown }).stderr);
            const match = stderr.match(/version "(\d+)/);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
    }
    return null;
}

/**
 * Resolve the path to smali-lsp.jar.
 * Checks user config first, then the tool download path.
 */
function resolveServerJar(): string | null {
    const config = workspace.getConfiguration(extensionConfigName);
    const userPath = config.get<string>("smaliLspPath");
    if (userPath && fs.existsSync(userPath)) {
        return userPath;
    }
    return null;
}

export namespace smaliLsp {
    /**
     * Start the Smali LSP server for the given document's project.
     * No-ops if already running.
     */
    export async function startServer(document: TextDocument): Promise<void> {
        if (client) return;

        const projectRoot = findApktoolProjectRoot(
            path.dirname(document.uri.fsPath),
        );
        if (!projectRoot) {
            outputChannel.appendLine(
                "Smali LSP: No APKTool project found (no apktool.yml in parent dirs)",
            );
            return;
        }

        const config = workspace.getConfiguration(extensionConfigName);
        const javaPath = config.get<string>("javaPath") || "java";

        const javaVersion = checkJavaVersion(javaPath);
        if (javaVersion === null) {
            window.showErrorMessage(
                `APKLab: Java not found at "${javaPath}". Smali LSP requires Java 17+.`,
            );
            return;
        }
        if (javaVersion < 17) {
            window.showErrorMessage(
                `APKLab: Java ${javaVersion} found, but Smali LSP requires Java 17+.`,
            );
            return;
        }

        const serverJar = resolveServerJar();
        if (!serverJar) {
            outputChannel.appendLine(
                "Smali LSP: Server JAR not found. Configure apklab.smaliLspPath or wait for tool download.",
            );
            return;
        }

        outputChannel.appendLine(
            `Smali LSP: Starting for project ${projectRoot}`,
        );
        outputChannel.appendLine(`  Java: ${javaPath} (v${javaVersion})`);
        outputChannel.appendLine(`  Server: ${serverJar}`);

        const serverOptions: ServerOptions = {
            command: javaPath,
            args: ["-jar", serverJar, "--lsp"],
        };

        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: "file", language: "smali" }],
            synchronize: {
                fileEvents: workspace.createFileSystemWatcher("**/*.smali"),
            },
            outputChannel: outputChannel,
            revealOutputChannelOn: 4, // Never
            workspaceFolder: {
                uri: Uri.file(projectRoot),
                name: path.basename(projectRoot),
                index: 0,
            },
        };

        client = new LanguageClient(
            "smaliLsp",
            "Smali Language Server",
            serverOptions,
            clientOptions,
        );

        try {
            await client.start();
            outputChannel.appendLine("Smali LSP: Server started successfully");
        } catch (err) {
            outputChannel.appendLine(`Smali LSP: Failed to start: ${err}`);
            window.showErrorMessage(
                "APKLab: Failed to start Smali LSP. Check Output for details.",
            );
            client = undefined;
        }
    }

    /**
     * Stop the language server if running.
     */
    export async function stopServer(): Promise<void> {
        if (client) {
            await client.stop();
            client = undefined;
            outputChannel.appendLine("Smali LSP: Server stopped");
        }
    }

    /**
     * Register the LSP lifecycle handlers.
     * Lazily starts the server when a .smali file is opened.
     */
    export function register(context: ExtensionContext): void {
        // Start server when a smali file is opened
        const onOpen = workspace.onDidOpenTextDocument((document) => {
            if (document.languageId === "smali" && !client) {
                startServer(document);
            }
        });
        context.subscriptions.push(onOpen);

        // Check if a smali file is already open
        const activeEditor = window.activeTextEditor;
        if (activeEditor?.document.languageId === "smali") {
            startServer(activeEditor.document);
        }
    }

    /**
     * Returns true if the LSP server is currently running.
     */
    export function isRunning(): boolean {
        return client !== undefined;
    }
}

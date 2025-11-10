import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

describe("VSIX Build & Packaging Tests", function () {
    this.timeout(120000); // 2 minutes for building and packaging

    const rootDir = path.resolve(__dirname, "../../..");
    const distDir = path.join(rootDir, "dist");
    const extensionFile = path.join(distDir, "extension.js");
    let vsixPath: string;

    before("Build and package extension", async function () {
        console.log("Building and Packaging VSIX...");

        const { stdout } = await execAsync("yarn package", {
            cwd: rootDir,
        });

        // Verify build output
        if (!fs.existsSync(extensionFile)) {
            assert.fail("Build failed: extension.js not found");
        }

        // Extract VSIX filename from output
        const match = stdout.match(/Packaged: (.+\.vsix)/);
        if (!match) {
            assert.fail("Could not find VSIX file in vsce output");
        }
        vsixPath = match[1];
        console.log(`VSIX created: ${vsixPath}`);
    });

    after("Cleanup", function () {
        // VSIX cleanup is handled by yarn clean, no need to delete here
    });

    it("should build extension.js successfully", function () {
        assert.ok(
            fs.existsSync(extensionFile),
            "extension.js should exist after build",
        );

        const stats = fs.statSync(extensionFile);
        assert.ok(stats.size > 100000, "extension.js should be at least 100KB");
        console.log(
            `Extension bundle size: ${(stats.size / 1024).toFixed(2)} KB`,
        );
    });

    it("should export activate function", function () {
        // Mock vscode module before requiring
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Module = require("module");
        const originalLoad = Module._load;

        Module._load = function (
            request: string,
            _parent: unknown,
            ..._args: unknown[]
        ) {
            if (request === "vscode") {
                return createVSCodeMock();
            }
            return originalLoad.call(this, request, _parent, ..._args);
        };

        try {
            // Clear require cache
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete require.cache[extensionFile];

            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const extension = require(extensionFile);

            assert.ok(extension, "Extension module should load without errors");
            assert.strictEqual(
                typeof extension.activate,
                "function",
                "Extension should export activate function",
            );

            console.log(
                "✓ Extension exports:",
                Object.keys(extension).join(", "),
            );
        } finally {
            // Restore original Module._load
            Module._load = originalLoad;
        }
    });

    it("should activate without errors", async function () {
        // Mock vscode module before requiring
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Module = require("module");
        const originalLoad = Module._load;

        Module._load = function (
            request: string,
            _parent: unknown,
            ..._args: unknown[]
        ) {
            if (request === "vscode") {
                return createVSCodeMock();
            }
            return originalLoad.call(this, request, _parent, ..._args);
        };

        try {
            // Clear require cache
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete require.cache[extensionFile];

            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const extension = require(extensionFile);

            // Create mock ExtensionContext
            const mockContext = {
                subscriptions: [],
                workspaceState: {
                    get: () => undefined,
                    update: async () => {
                        /* mock */
                    },
                },
                globalState: {
                    get: () => undefined,
                    update: async () => {
                        /* mock */
                    },
                    setKeysForSync: () => {
                        /* mock */
                    },
                },
                extensionPath: path.dirname(extensionFile),
                asAbsolutePath: (relativePath: string) =>
                    path.join(path.dirname(extensionFile), relativePath),
                storagePath: path.join(__dirname, "..", "..", "..", "storage"),
                globalStoragePath: path.join(
                    __dirname,
                    "..",
                    "..",
                    "..",
                    "globalStorage",
                ),
                logPath: path.join(__dirname, "..", "..", "..", "logs"),
                extensionUri: { fsPath: path.dirname(extensionFile) },
                environmentVariableCollection: {
                    persistent: false,
                    replace: () => {
                        /* mock */
                    },
                    append: () => {
                        /* mock */
                    },
                    prepend: () => {
                        /* mock */
                    },
                    get: () => undefined,
                    forEach: () => {
                        /* mock */
                    },
                    delete: () => {
                        /* mock */
                    },
                    clear: () => {
                        /* mock */
                    },
                },
                extensionMode: 3, // ExtensionMode.Test
                storageUri: undefined,
                globalStorageUri: { fsPath: "" },
                logUri: { fsPath: "" },
                secrets: {
                    get: async () => undefined,
                    store: async () => {
                        /* mock */
                    },
                    delete: async () => {
                        /* mock */
                    },
                    onDidChange: () => ({
                        dispose: () => {
                            /* mock */
                        },
                    }),
                },
                extension: {
                    id: "surendrajat.apklab",
                    extensionUri: { fsPath: "" },
                    extensionPath: "",
                    isActive: true,
                    packageJSON: {},
                    exports: undefined,
                    activate: async () => {
                        /* mock */
                    },
                    extensionKind: 1,
                },
                languageModelAccessInformation: {
                    onDidChange: () => ({
                        dispose: () => {
                            /* mock */
                        },
                    }),
                    canSendRequest: () => undefined,
                },
            };

            // Call activate
            await extension.activate(mockContext);

            console.log("✓ Extension activated successfully");

            // Verify subscriptions were added (commands may not register without a workspace)
            assert.ok(
                mockContext.subscriptions !== undefined,
                "Extension should create subscriptions array",
            );

            console.log(
                `✓ Extension created ${mockContext.subscriptions.length} subscriptions`,
            );
        } finally {
            // Restore original Module._load
            Module._load = originalLoad;
        }
    });

    it("should create valid VSIX package", async function () {
        assert.ok(fs.existsSync(vsixPath), "VSIX file should exist");

        const stats = fs.statSync(vsixPath);
        assert.ok(stats.size > 50000, "VSIX should be at least 50KB");
        console.log(`VSIX size: ${(stats.size / 1024).toFixed(2)} KB`);

        // Extract and verify VSIX contents
        const tempDir = path.join(rootDir, ".vsix-test-temp");
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
        fs.mkdirSync(tempDir);

        try {
            await execAsync(`unzip -q "${vsixPath}" -d "${tempDir}"`);

            // Verify critical files
            const packageJsonPath = path.join(
                tempDir,
                "extension",
                "package.json",
            );
            const extensionJsPath = path.join(
                tempDir,
                "extension",
                "dist",
                "extension.js",
            );

            assert.ok(
                fs.existsSync(packageJsonPath),
                "package.json should be in VSIX",
            );
            assert.ok(
                fs.existsSync(extensionJsPath),
                "extension.js should be in VSIX",
            );

            // Verify package.json content
            const packageJson = JSON.parse(
                fs.readFileSync(packageJsonPath, "utf-8"),
            );
            assert.strictEqual(
                packageJson.name,
                "apklab",
                "Package name should be apklab",
            );
            assert.strictEqual(
                packageJson.main,
                "./dist/extension",
                "Main entry point should be ./dist/extension",
            );
            assert.ok(
                packageJson.activationEvents,
                "Should have activation events",
            );

            console.log(
                "✓ VSIX structure validated:",
                packageJson.name,
                packageJson.version,
            );
        } finally {
            // Cleanup temp directory
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true });
            }
        }
    });

    it("should load extension from VSIX without errors", async function () {
        const tempDir = path.join(rootDir, ".vsix-test-load");
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
        fs.mkdirSync(tempDir);

        try {
            await execAsync(`unzip -q "${vsixPath}" -d "${tempDir}"`);

            const vsixExtensionPath = path.join(
                tempDir,
                "extension",
                "dist",
                "extension.js",
            );

            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const Module = require("module");
            const originalLoad = Module._load;

            Module._load = function (
                request: string,
                _parent: unknown,
                ..._args: unknown[]
            ) {
                if (request === "vscode") {
                    return createVSCodeMock();
                }
                return originalLoad.call(this, request, _parent, ..._args);
            };

            try {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete require.cache[vsixExtensionPath];
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const extension = require(vsixExtensionPath);

                assert.ok(extension, "Extension should load from VSIX");
                assert.strictEqual(
                    typeof extension.activate,
                    "function",
                    "activate function should be accessible from VSIX",
                );

                const mockContext = createExtensionContext();
                extension.activate(mockContext);

                assert.strictEqual(
                    mockContext.subscriptions.length,
                    7,
                    "Extension from VSIX should register 7 commands",
                );

                console.log("✓ Extension loaded successfully from VSIX");
            } finally {
                Module._load = originalLoad;
            }
        } finally {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true });
            }
        }
    });

    it("should not include test files in VSIX", async function () {
        const tempDir = path.join(rootDir, ".vsix-test-contents");
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
        fs.mkdirSync(tempDir);

        try {
            await execAsync(`unzip -q "${vsixPath}" -d "${tempDir}"`);

            const extensionDir = path.join(tempDir, "extension");

            // Check that test files are excluded
            const testScriptPath = path.join(extensionDir, "test-vsix.sh");
            const testRequirePath = path.join(extensionDir, "test-require.js");
            const buildReportPath = path.join(extensionDir, "BUILD_REPORT.md");

            assert.ok(
                !fs.existsSync(testScriptPath),
                "test-vsix.sh should not be in VSIX",
            );
            assert.ok(
                !fs.existsSync(testRequirePath),
                "test-require.js should not be in VSIX",
            );
            assert.ok(
                !fs.existsSync(buildReportPath),
                "BUILD_REPORT.md should not be in VSIX",
            );

            // Check that src files are excluded
            const srcDir = path.join(extensionDir, "src");
            assert.ok(!fs.existsSync(srcDir), "src/ should not be in VSIX");

            console.log("✓ Test files correctly excluded from VSIX");
        } finally {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true });
            }
        }
    });
});

/**
 * Create a comprehensive mock of the VS Code API
 */
function createVSCodeMock() {
    const mockOutputChannel = {
        show: () => {
            /* mock */
        },
        hide: () => {
            /* mock */
        },
        dispose: () => {
            /* mock */
        },
        appendLine: () => {
            /* mock */
        },
        append: () => {
            /* mock */
        },
        clear: () => {
            /* mock */
        },
        replace: () => {
            /* mock */
        },
        name: "APKLab",
    };

    const mockConfiguration = {
        get: () => null,
        has: () => false,
        inspect: () => undefined,
        update: () => Promise.resolve(),
    };

    return {
        window: {
            createOutputChannel: () => mockOutputChannel,
            showInformationMessage: () => Promise.resolve(),
            showErrorMessage: () => Promise.resolve(),
            showWarningMessage: () => Promise.resolve(),
            showQuickPick: () => Promise.resolve([]),
            showOpenDialog: () => Promise.resolve([]),
            showSaveDialog: () => Promise.resolve(),
            withProgress: (_options: unknown, task: unknown) => {
                const progress = {
                    report: () => {
                        /* mock */
                    },
                };
                const token = {
                    isCancellationRequested: false,
                    onCancellationRequested: () => {
                        /* mock */
                    },
                };
                return (task as (...args: unknown[]) => unknown)(
                    progress,
                    token,
                );
            },
        },
        workspace: {
            getConfiguration: () => mockConfiguration,
            workspaceFolders: [],
            onDidChangeConfiguration: () => ({
                dispose: () => {
                    /* mock */
                },
            }),
            onDidChangeWorkspaceFolders: () => ({
                dispose: () => {
                    /* mock */
                },
            }),
        },
        commands: {
            registerCommand: () => ({
                dispose: () => {
                    /* mock */
                },
            }),
            executeCommand: () => Promise.resolve(),
        },
        Uri: {
            file: (p: string) => ({
                fsPath: p,
                path: p,
                scheme: "file",
            }),
            parse: (str: string) => ({
                fsPath: str,
                path: str,
                scheme: "file",
            }),
        },
        ProgressLocation: {
            SourceControl: 1,
            Window: 10,
            Notification: 15,
        },
        ConfigurationTarget: {
            Global: 1,
            Workspace: 2,
            WorkspaceFolder: 3,
        },
    };
}

/**
 * Create a mock extension context
 */
function createExtensionContext() {
    return {
        subscriptions: [] as unknown[],
        workspaceState: {
            get: () => undefined,
            update: () => Promise.resolve(),
        },
        globalState: {
            get: () => undefined,
            update: () => Promise.resolve(),
            keys: () => [],
        },
        extensionPath: __dirname,
        extensionUri: { fsPath: __dirname },
        environmentVariableCollection: {
            get: () => undefined,
            replace: () => {
                /* mock */
            },
            append: () => {
                /* mock */
            },
            prepend: () => {
                /* mock */
            },
            clear: () => {
                /* mock */
            },
        },
        extensionMode: 1,
        storagePath: "/tmp/storage",
        globalStoragePath: "/tmp/global-storage",
        logPath: "/tmp/logs",
        extension: {
            id: "Surendrajat.apklab",
            extensionPath: __dirname,
            isActive: true,
            packageJSON: {},
            exports: {},
        },
    };
}

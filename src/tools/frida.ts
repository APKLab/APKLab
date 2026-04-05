import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as vscode from "vscode";
import { outputChannel, APKTOOL_YML_FILENAME } from "../data/constants";
import { findMainActivity } from "../utils/manifest";

const FRIDA_HOOKS_FILENAME = "frida_hooks.ts";
const GADGET_INJECT_MARKER = "# apklab-gadget-inject";

interface SmaliMethod {
    className: string;
    methodName: string;
    paramTypes: string[];
    returnType: string;
    isStatic: boolean;
    isConstructor: boolean;
}

/**
 * Parse smali type descriptor to Java/Frida type string.
 * e.g. "Ljava/lang/String;" -> "java.lang.String"
 *      "I" -> "int"
 *      "[B" -> "[B"
 */
function smaliTypeToJava(smaliType: string): string {
    if (smaliType.startsWith("[")) {
        return smaliType; // keep array notation for Frida overload
    }
    switch (smaliType) {
        case "V":
            return "void";
        case "Z":
            return "boolean";
        case "B":
            return "byte";
        case "S":
            return "short";
        case "C":
            return "char";
        case "I":
            return "int";
        case "J":
            return "long";
        case "F":
            return "float";
        case "D":
            return "double";
        default:
            if (smaliType.startsWith("L") && smaliType.endsWith(";")) {
                return smaliType.slice(1, -1).replace(/\//g, ".");
            }
            return smaliType;
    }
}

/**
 * Parse smali method parameter list.
 * e.g. "ILjava/lang/String;Z" -> ["I", "Ljava/lang/String;", "Z"]
 */
function parseSmaliParams(paramStr: string): string[] {
    const params: string[] = [];
    let i = 0;
    while (i < paramStr.length) {
        let arrayPrefix = "";
        while (i < paramStr.length && paramStr[i] === "[") {
            arrayPrefix += "[";
            i++;
        }
        if (i >= paramStr.length) break;

        if (paramStr[i] === "L") {
            const semi = paramStr.indexOf(";", i);
            if (semi === -1) break;
            params.push(arrayPrefix + paramStr.slice(i, semi + 1));
            i = semi + 1;
        } else {
            params.push(arrayPrefix + paramStr[i]);
            i++;
        }
    }
    return params;
}

/**
 * Parse a .method directive line and class context into SmaliMethod.
 */
function parseMethodFromLine(
    line: string,
    className: string,
): SmaliMethod | null {
    // .method public static foo(ILjava/lang/String;)V
    const match = line.match(
        /\.method\s+(?:(?:public|private|protected|static|final|synthetic|bridge|varargs|declared-synchronized|abstract|native|strictfp|constructor)\s+)*(\S+)\(([^)]*)\)(\S+)/,
    );
    if (!match) return null;

    const methodName = match[1];
    const paramStr = match[2];
    const returnType = match[3];
    const isStatic = /\bstatic\b/.test(line);
    const isConstructor = methodName === "<init>" || methodName === "<clinit>";

    return {
        className: smaliTypeToJava("L" + className + ";"),
        methodName,
        paramTypes: parseSmaliParams(paramStr),
        returnType,
        isStatic,
        isConstructor,
    };
}

/**
 * Get the class name from the .class directive in the document.
 */
function getClassNameFromDocument(document: vscode.TextDocument): string {
    const text = document.getText();
    const match = text.match(/\.class\s+[^L]*L([^;]+);/);
    return match ? match[1] : "unknown/Class";
}

/**
 * Generate Frida TypeScript hook code for a method.
 */
function generateFridaHook(method: SmaliMethod): string {
    const javaParams = method.paramTypes.map(smaliTypeToJava);
    const javaReturn = smaliTypeToJava(method.returnType);

    const overloadArgs = javaParams.map((p) => `'${p}'`).join(", ");
    const hookParams = method.paramTypes.map((_, i) => `arg${i}`).join(", ");

    if (method.isConstructor && method.methodName === "<init>") {
        return `
// Hook: ${method.className}.<init>(${javaParams.join(", ")})
Java.perform(() => {
    const cls = Java.use('${method.className}');
    cls.$init.overload(${overloadArgs}).implementation = function(${hookParams}) {
        console.log(\`[*] ${method.className}.<init> called\`);
${javaParams.map((_, i) => `        console.log(\`    arg${i}: \${arg${i}}\`);`).join("\n")}
        return this.$init(${hookParams});
    };
});
`.trim();
    }

    const returnLine =
        javaReturn === "void"
            ? `this.${method.methodName}(${hookParams});`
            : `const ret = this.${method.methodName}(${hookParams});\n        console.log(\`    ret: \${ret}\`);\n        return ret;`;

    return `
// Hook: ${method.className}.${method.methodName}(${javaParams.join(", ")}): ${javaReturn}
Java.perform(() => {
    const cls = Java.use('${method.className}');
    cls.${method.methodName}.overload(${overloadArgs}).implementation = function(${hookParams}) {
        console.log(\`[*] ${method.className}.${method.methodName} called\`);
${javaParams.map((_, i) => `        console.log(\`    arg${i}: \${arg${i}}\`);`).join("\n")}
        ${returnLine}
    };
});
`.trim();
}

/**
 * Find the APKTool project root from a file path.
 */
function findProjectRoot(filePath: string): string | null {
    let dir = path.dirname(filePath);
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

export namespace frida {
    /**
     * Generate a Frida hook for the method at the current cursor line.
     */
    export async function generateHook(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== "smali") {
            vscode.window.showWarningMessage(
                "APKLab: Open a .smali file to generate Frida hooks.",
            );
            return;
        }

        const document = editor.document;
        const line = document.lineAt(editor.selection.active.line);
        const lineText = line.text.trim();

        // Walk up to find the enclosing .method if cursor isn't on one
        let methodLine = lineText;
        if (!methodLine.startsWith(".method ")) {
            for (let i = editor.selection.active.line; i >= 0; i--) {
                const l = document.lineAt(i).text.trim();
                if (l.startsWith(".method ")) {
                    methodLine = l;
                    break;
                }
                if (
                    l.startsWith(".end method") &&
                    i < editor.selection.active.line
                ) {
                    break;
                }
            }
        }

        if (!methodLine.startsWith(".method ")) {
            vscode.window.showWarningMessage(
                "APKLab: Place cursor on or inside a .method to generate a Frida hook.",
            );
            return;
        }

        const className = getClassNameFromDocument(document);
        const method = parseMethodFromLine(methodLine, className);
        if (!method) {
            vscode.window.showWarningMessage(
                "APKLab: Could not parse method signature.",
            );
            return;
        }

        const hookCode = generateFridaHook(method);
        const projectRoot = findProjectRoot(document.uri.fsPath);
        if (!projectRoot) {
            vscode.window.showWarningMessage(
                "APKLab: No APKTool project found.",
            );
            return;
        }

        const hooksFile = path.join(projectRoot, FRIDA_HOOKS_FILENAME);
        const separator = fs.existsSync(hooksFile) ? "\n\n" : "";
        const existing = fs.existsSync(hooksFile)
            ? fs.readFileSync(hooksFile, "utf-8")
            : "";

        fs.writeFileSync(hooksFile, existing + separator + hookCode + "\n");

        const doc = await vscode.workspace.openTextDocument(hooksFile);
        await vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: vscode.ViewColumn.Beside,
        });

        outputChannel.appendLine(
            `Frida: Generated hook for ${method.className}.${method.methodName}`,
        );
        vscode.window.showInformationMessage(
            `Frida hook generated for ${method.methodName}`,
        );
    }

    /**
     * Inject Frida gadget into an APK project.
     * - Copies gadget .so with a random name to lib/<arch>/
     * - Creates config .so and optional script .so
     * - Patches main activity's smali to load the gadget
     */
    export async function injectGadget(
        apktoolYmlUri: vscode.Uri,
    ): Promise<void> {
        const projectDir = path.dirname(apktoolYmlUri.fsPath);

        // Ask user for gadget .so path
        const gadgetFiles = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: "Select Frida Gadget .so",
            filters: { "Shared Library": ["so"] },
        });
        if (!gadgetFiles || gadgetFiles.length === 0) return;

        const gadgetSoPath = gadgetFiles[0].fsPath;

        // Detect arch from ELF header, fall back to filename
        const detectedArch = detectArch(gadgetSoPath);
        const archOptions = ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"];
        if (detectedArch && archOptions.includes(detectedArch)) {
            archOptions.splice(archOptions.indexOf(detectedArch), 1);
            archOptions.unshift(detectedArch);
        }
        const selectedArch = await vscode.window.showQuickPick(archOptions, {
            placeHolder: detectedArch
                ? `Detected: ${detectedArch} — confirm or pick another`
                : "Select target architecture",
            canPickMany: false,
        });
        if (!selectedArch) return;

        // Find main activity
        const manifestPath = path.join(projectDir, "AndroidManifest.xml");
        if (!fs.existsSync(manifestPath)) {
            vscode.window.showErrorMessage(
                "APKLab: AndroidManifest.xml not found in project.",
            );
            return;
        }

        const mainActivityClass = findMainActivity(manifestPath);
        if (!mainActivityClass) {
            vscode.window.showErrorMessage(
                "APKLab: Could not find main/launcher activity in AndroidManifest.xml.",
            );
            return;
        }

        outputChannel.appendLine(
            `Frida Gadget: Main activity is ${mainActivityClass}`,
        );

        // Generate random library name to avoid detection
        const gadgetBaseName = generateGadgetName();
        const libName = `lib${gadgetBaseName}.so`;

        // 1. Copy gadget .so with random name to lib/<arch>/
        const libDir = path.join(projectDir, "lib", selectedArch);
        if (!fs.existsSync(libDir)) {
            fs.mkdirSync(libDir, { recursive: true });
        }
        const gadgetDest = path.join(libDir, libName);
        fs.copyFileSync(gadgetSoPath, gadgetDest);
        outputChannel.appendLine(`Frida Gadget: Copied to ${gadgetDest}`);

        // 2. Create gadget config (.config.so so APKTool preserves it)
        const configName = `lib${gadgetBaseName}.config.so`;
        const hooksFile = path.join(projectDir, FRIDA_HOOKS_FILENAME);
        const hasHooks = fs.existsSync(hooksFile);

        // Script name uses .js.so extension so APKTool keeps it in lib/
        const scriptName = `lib${gadgetBaseName}.js.so`;

        const gadgetConfig = {
            interaction: {
                type: hasHooks ? "script" : "listen",
                ...(hasHooks
                    ? { path: `./${scriptName}` }
                    : { address: "0.0.0.0", port: 27042 }),
            },
        };
        const configDest = path.join(libDir, configName);
        fs.writeFileSync(
            configDest,
            JSON.stringify(gadgetConfig, null, 2) + "\n",
        );
        outputChannel.appendLine(
            `Frida Gadget: Config written to ${configDest}`,
        );

        // 3. Copy hooks as .js.so if they exist
        if (hasHooks) {
            const scriptDest = path.join(libDir, scriptName);
            fs.copyFileSync(hooksFile, scriptDest);
            outputChannel.appendLine(
                `Frida Gadget: Script copied to ${scriptDest}`,
            );
        }

        // 4. Patch main activity smali to load gadget
        const activitySmaliPath = findSmaliFile(projectDir, mainActivityClass);
        if (!activitySmaliPath) {
            vscode.window.showErrorMessage(
                `APKLab: Could not find smali file for ${mainActivityClass}.`,
            );
            return;
        }

        const patched = patchSmaliWithGadgetLoad(
            activitySmaliPath,
            gadgetBaseName,
        );
        if (patched) {
            outputChannel.appendLine(
                `Frida Gadget: Patched ${activitySmaliPath}`,
            );
            vscode.window.showInformationMessage(
                `Frida gadget injected! Patched ${mainActivityClass}`,
            );
        } else {
            vscode.window.showInformationMessage(
                "Frida gadget files copied. Main activity already patched or no onCreate found.",
            );
        }
    }
}

/**
 * Detect architecture from ELF header (e_machine field at bytes 18-19).
 * Falls back to filename-based detection if not a valid ELF.
 */
function detectArch(filePath: string): string | null {
    try {
        const fd = fs.openSync(filePath, "r");
        try {
            const header = Buffer.alloc(20);
            fs.readSync(fd, header, 0, 20, 0);

            // Verify ELF magic: 0x7f 'E' 'L' 'F'
            if (
                header[0] !== 0x7f ||
                header[1] !== 0x45 ||
                header[2] !== 0x4c ||
                header[3] !== 0x46
            ) {
                return detectArchFromFilename(filePath);
            }

            // e_machine at offset 18 (little-endian uint16)
            const eMachine = header.readUInt16LE(18);
            switch (eMachine) {
                case 0x28:
                    return "armeabi-v7a"; // EM_ARM
                case 0xb7:
                    return "arm64-v8a"; // EM_AARCH64
                case 0x03:
                    return "x86"; // EM_386
                case 0x3e:
                    return "x86_64"; // EM_X86_64
                default:
                    return detectArchFromFilename(filePath);
            }
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        return detectArchFromFilename(filePath);
    }
}

/**
 * Fallback: detect architecture from gadget filename.
 */
function detectArchFromFilename(filePath: string): string | null {
    const name = path.basename(filePath).toLowerCase();
    if (name.includes("arm64") || name.includes("aarch64")) return "arm64-v8a";
    if (name.includes("arm")) return "armeabi-v7a";
    if (name.includes("x86_64") || name.includes("x64")) return "x86_64";
    if (name.includes("x86") || name.includes("i386")) return "x86";
    return null;
}

/**
 * Find the smali file for a given class name.
 * Class name format: "com.example.MainActivity"
 */
function findSmaliFile(projectDir: string, className: string): string | null {
    const relativePath = className.replace(/\./g, "/") + ".smali";

    // Check smali, smali_classes2, smali_classes3, etc.
    const entries = fs.readdirSync(projectDir);
    const smaliDirs = entries.filter((e) => e.startsWith("smali")).sort();

    for (const dir of smaliDirs) {
        const candidate = path.join(projectDir, dir, relativePath);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

/**
 * Generate a random plausible-looking Android library name.
 * Returns just the base name (without lib prefix or .so suffix).
 * e.g. "hdprocess", "nativebridge", "artcompiler"
 */
function generateGadgetName(): string {
    const hex = crypto.randomBytes(4).toString("hex");
    return `ndk_${hex}`;
}

/**
 * Patch a smali file to load a native library in onCreate.
 * Uses a safe register (bumps .locals/.registers count and uses the new slot).
 * Adds a marker comment for idempotent detection.
 */
function patchSmaliWithGadgetLoad(
    smaliPath: string,
    libBaseName: string,
): boolean {
    const content = fs.readFileSync(smaliPath, "utf-8");

    // Check if already patched
    if (content.includes(GADGET_INJECT_MARKER)) return false;

    const lines = content.split("\n");
    const result: string[] = [];
    let patched = false;

    for (let i = 0; i < lines.length; i++) {
        result.push(lines[i]);

        // Find onCreate method and insert after .locals/.registers directive
        if (
            !patched &&
            lines[i]
                .trim()
                .match(/\.method\s+.*onCreate\(Landroid\/os\/Bundle;\)V/)
        ) {
            // Find the .locals or .registers line
            for (i++; i < lines.length; i++) {
                result.push(lines[i]);
                const trimmed = lines[i].trim();
                if (
                    trimmed.startsWith(".locals") ||
                    trimmed.startsWith(".registers")
                ) {
                    const localsMatch = trimmed.match(
                        /\.(locals|registers)\s+(\d+)/,
                    );
                    if (!localsMatch) break;

                    const directive = localsMatch[1];
                    const count = parseInt(localsMatch[2]);
                    let safeReg: string;

                    if (directive === "locals") {
                        // .locals N -> .locals N+1, new register is vN
                        safeReg = `v${count}`;
                    } else {
                        // .registers M with onCreate(Bundle): 2 params (this + Bundle)
                        // locals = M - 2, new local = v(M-2) after bumping to M+1
                        safeReg = `v${count - 2}`;
                    }

                    // Bump the count
                    result[result.length - 1] = lines[i].replace(
                        /\d+/,
                        String(count + 1),
                    );

                    // Insert gadget load code with marker
                    result.push("");
                    result.push(`    ${GADGET_INJECT_MARKER}`);
                    result.push(
                        `    const-string ${safeReg}, "${libBaseName}"`,
                    );
                    result.push("");
                    result.push(
                        `    invoke-static {${safeReg}}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V`,
                    );
                    result.push("");
                    patched = true;
                    break;
                }
            }
        }
    }

    if (patched) {
        fs.writeFileSync(smaliPath, result.join("\n"));
    }
    return patched;
}

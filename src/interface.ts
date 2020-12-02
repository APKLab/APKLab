import { QuickPickItem, window } from 'vscode';
import { apktool } from './tools';
import { outputChannel } from './common';

/**
 * QuickPickItem array for additional **Apktool** args for APK decoding.
 */
const decodeQuickPickItems: QuickPickItem[] = [
    {
        label: "decompile_java",
        detail: "Decompiles APK to Java source using Jadx",
        description: "[Use Jadx]"
    },
    {
        label: "--no-src",
        detail: "Do not decompile dex to smali (-s)",
        alwaysShow: true
    },
    {
        label: "--no-res",
        detail: "Do not decompile resources (-r)",
        alwaysShow: true
    },
    {
        label: "--force-manifest",
        detail: "Forces decode of AndroidManifest regardless of decoding of resources flag."
    },
    {
        label: "--no-assets",
        detail: "Prevents decoding/copying of unknown asset files.",
        alwaysShow: true
    },
    {
        label: "--only-main-classes",
        detail: "Only disassemble dex classes in root (classes[0-9]*.dex)"
    },
    {
        label: "--no-debug-info",
        detail: "Prevents baksmali from writing out debug info (.local, .param, .line, etc). (-b)"
    }
];

/**
 * QuickPickItem array for additional **Apktool** args for APK building.
 */
const rebuildQuickPickItems: QuickPickItem[] = [
    {
        label: "--use-aapt2",
        detail: "Use the aapt2 binary instead of appt",
        alwaysShow: true,
        picked: true
    },
    {
        label: "--debug",
        detail: "Build APK in Debug mode by adding debuggable=\"true\" to AndroidManifest file",
        alwaysShow: true,
    },
    {
        label: "--force-all",
        detail: "Overwrites existing files during build, reassembling the resources.arsc file and dex file(s)",
        alwaysShow: true
    },
    {
        label: "--no-crunch",
        detail: "Disable crunching of resource files during the build step",
        alwaysShow: true
    }
];


export namespace UI {

    /**
     * Show a QuickPick with multiple items.
     * @param items QuickPickItems to show in the QuickPick.
     * @param placeHolder Place holder text in the box under QuickPick.
     * @returns string[] of the label for selected QuickPickItem[].
     */
    export async function showArgsQuickPick(items: QuickPickItem[], placeHolder: string): Promise<string[] | undefined> {
        const result = await window.showQuickPick(items, {
            placeHolder: placeHolder,
            canPickMany: true,
            matchOnDetail: true,
            matchOnDescription: true,
            ignoreFocusOut: true
        });
        return result ? result.map<string>((item) => item.label) : undefined;
    }

    /**
     * Show a APK file chooser window and decompile that APK.
     */
    export async function decompileAPK() {
        // browse for an APK file
        let result = await window.showOpenDialog({
            canSelectFolders: false,
            filters: {
                APK: ["apk"]
            },
            openLabel: "Select an APK file",
        });
        if (result && result.length === 1) {
            let args = await showArgsQuickPick(decodeQuickPickItems, 'Additional apktool/jadx arguments');
            if (args) {
                const decompileJavaIndex = args.indexOf("decompile_java");
                let decompileJava = false;
                if (decompileJavaIndex > -1) {
                    decompileJava = true;
                    args.splice(decompileJavaIndex, 1);
                }
                apktool.decodeAPK(result[0].fsPath, args, decompileJava);
            }
        } else {
            outputChannel.appendLine("APKLAB: no APK file was chosen");
        }
    }

    /**
     * Show a QuickPick with extra args and build the APK.
     * @param apktoolYmlPath path of the `apktool.yml` file.
     */
    export async function rebuildAPK(apktoolYmlPath: string) {
        const args = await showArgsQuickPick(rebuildQuickPickItems, 'Additional apktool arguments');
        if (args) {
            apktool.rebuildAPK(apktoolYmlPath, args);
        }
    }
}

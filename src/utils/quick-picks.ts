import { QuickPickItem } from "vscode";

const quickPickItems: { [index: string]: QuickPickItem[] } = {
    /**
     * QuickPickItem array for additional **Apktool** args for APK building.
     */
    rebuildQuickPickItems: [
        {
            label: "--use-aapt2",
            detail: "Use the aapt2 binary instead of aapt",
            alwaysShow: true,
            picked: true,
        },
        {
            label: "--debug",
            detail:
                'Build APK in Debug mode by adding debuggable="true" to AndroidManifest file',
            alwaysShow: true,
        },
        {
            label: "--force-all",
            detail:
                "Overwrites existing files during build, reassembling the resources.arsc file and dex file(s)",
            alwaysShow: true,
        },
        {
            label: "--no-crunch",
            detail: "Disable crunching of resource files during the build step",
            alwaysShow: true,
        },
    ],
    /**
     * QuickPickItem array for additional **Apktool** args for APK decoding.
     */
    decodeQuickPickItems: [
        {
            label: "quark_analysis",
            detail:
                "Detect potential malicious activities in APK using Quark-Engine.",
            description: "[Use Quark-Engine]",
        },
        {
            label: "decompile_java",
            detail: "Decompiles APK to Java source using Jadx",
            description: "[Use Jadx]",
        },
        {
            label: "--no-src (apktool)",
            detail: "Do not decompile dex to smali (-s)",
            alwaysShow: true,
        },
        {
            label: "--no-res (apktool)",
            detail: "Do not decompile resources (-r)",
            alwaysShow: true,
        },
        {
            label: "--force-manifest (apktool)",
            detail:
                "Forces decode of AndroidManifest regardless of decoding of resources flag.",
        },
        {
            label: "--no-assets (apktool)",
            detail: "Prevents decoding/copying of unknown asset files.",
            alwaysShow: true,
        },
        {
            label: "--only-main-classes (apktool)",
            detail: "Only disassemble dex classes in root (classes[0-9]*.dex)",
            picked: true,
        },
        {
            label: "--no-debug-info (apktool)",
            detail:
                "Prevents baksmali from writing out debug info (.local, .param, .line, etc). (-b)",
        },
        {
            label: "--deobf (jadx)",
            detail: "Activate deobfuscation for Jadx",
            alwaysShow: true,
        },
        {
            label: "--show-bad-code (jadx)",
            detail: "show inconsistent code (incorrectly decompiled)",
            alwaysShow: true,
        },
    ],
};

export namespace quickPickUtil {
    export function getQuickPickItems(category: string): QuickPickItem[] {
        return quickPickItems[category];
    }

    export function setQuickPickDefault(category: string, label: string): void {
        if (quickPickItems[category]) {
            const targetOption = quickPickItems[category].filter(
                (x) => x.label === label
            )[0];
            if (targetOption) {
                targetOption.picked = true;
            }
        }
    }
}

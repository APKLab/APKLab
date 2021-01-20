import { QuickPickItem, window } from "vscode";
import { apktool } from "./tools";
import { outputChannel } from "./common";
import { quickPickUtil } from "./quick-pick.util";
import { Quark } from "./quark-tools";

export namespace UI {
    /**
     * Show a QuickPick with multiple items.
     * @param items QuickPickItems to show in the QuickPick.
     * @param placeHolder Place holder text in the box under QuickPick.
     * @returns string[] of the label for selected QuickPickItem[].
     */
    export async function showArgsQuickPick(
        items: QuickPickItem[],
        placeHolder: string
    ): Promise<string[] | undefined> {
        const result = await window.showQuickPick(items, {
            placeHolder: placeHolder,
            canPickMany: true,
            matchOnDetail: true,
            matchOnDescription: true,
            ignoreFocusOut: true,
        });
        return result ? result.map<string>((item) => item.label) : undefined;
    }

    /**
     * Show a APK file chooser window and decompile that APK.
     */
    export async function decompileAPK(): Promise<void> {
        // browse for an APK file
        const result = await window.showOpenDialog({
            canSelectFolders: false,
            filters: {
                APK: ["apk"],
            },
            openLabel: "Select an APK file",
        });
        if (result && result.length === 1) {
            const args = await showArgsQuickPick(
                quickPickUtil.getQuickPickItems("decodeQuickPickItems"),
                "Additional apktool/jadx arguments"
            );
            if (args) {
                const decompileJavaIndex = args.indexOf("decompile_java");
                const quarkAnalysisIndex = args.indexOf("quark_analysis");
                let decompileJava = false;
                let quarkAnalysis = false;
                if (decompileJavaIndex > -1) {
                    decompileJava = true;
                    args.splice(decompileJavaIndex, 1);
                }
                if (quarkAnalysisIndex > -1) {
                    quarkAnalysis = true;
                    args.splice(quarkAnalysisIndex, 1);
                    if (!Quark.checkQuarkInstalled()) {
                        quarkAnalysis = false;
                        window.showErrorMessage(
                            "APKLab: Quark command not found, \
                            please make sure you have installed python3 and Quark-Engine. \
                            Check here to install Quark-Engine: \
                            https://github.com/quark-engine/quark-engine"
                        );
                        return;
                    }
                }
                await apktool.decodeAPK(
                    result[0].fsPath,
                    args,
                    decompileJava,
                    quarkAnalysis
                );
            }
        } else {
            outputChannel.appendLine("APKLAB: no APK file was chosen");
        }
    }

    /**
     * Show a QuickPick with extra args and build the APK.
     * @param apktoolYmlPath path of the `apktool.yml` file.
     */
    export async function rebuildAPK(apktoolYmlPath: string): Promise<void> {
        const args = await showArgsQuickPick(
            quickPickUtil.getQuickPickItems("rebuildQuickPickItems"),
            "Additional apktool arguments"
        );
        if (args) {
            await apktool.rebuildAPK(apktoolYmlPath, args);
        }
    }
}

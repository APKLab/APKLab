import * as path from "path";
import * as fs from "fs";
import { commands, QuickPickItem, Uri, window } from "vscode";
import { outputChannel } from "./data/constants";
import { quickPickUtil } from "./utils/quick-picks";
import { Quark } from "./tools/quark-engine";
import { apktool } from "./tools/apktool";
import { git } from "./tools/git";
import { jadx } from "./tools/jadx";

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
    ): Promise<QuickPickItem[] | undefined> {
        return await window.showQuickPick(items, {
            placeHolder: placeHolder,
            canPickMany: true,
            matchOnDetail: true,
            matchOnDescription: true,
            ignoreFocusOut: true,
        });
    }

    /**
     * Show a APK file chooser window and decompile that APK.
     */
    export async function openApkFile(): Promise<void> {
        // browse for an APK file
        const result = await window.showOpenDialog({
            canSelectFolders: false,
            filters: {
                APK: ["apk"],
            },
            openLabel: "Select an APK file",
        });
        if (result && result.length === 1) {
            const quickPickItems = await showArgsQuickPick(
                quickPickUtil.getQuickPickItems("decodeQuickPickItems"),
                "Additional features & Apktool/Jadx arguments"
            );

            if (quickPickItems) {
                const args = quickPickItems.map<string>((item) => item.label);
                const argsIndex = quickPickItems.map<string | undefined>(
                    (item) => item.description
                );
                const decompileJavaIndex = argsIndex.indexOf("[Use Jadx]");
                const quarkAnalysisIndex = argsIndex.indexOf(
                    "[Use Quark-Engine]"
                );
                const jadxOptionsIndex = argsIndex.indexOf("jadx");
                const jadxOptionsNumber = argsIndex.filter(
                    (item) => item === "jadx"
                ).length;
                let decompileJava = false;
                let quarkAnalysis = false;
                let jadxArgs: string[] = [];
                if (jadxOptionsIndex > -1) {
                    jadxArgs = args.splice(jadxOptionsIndex, jadxOptionsNumber);
                }
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

                // project directory name
                const apkFilePath = result[0].fsPath;
                let projectDir = path.join(
                    path.dirname(apkFilePath),
                    path.parse(apkFilePath).name
                );
                // don't delete the existing dir if it already exists
                while (fs.existsSync(projectDir)) {
                    projectDir = projectDir + "1";
                }

                // decode APK
                await apktool.decodeAPK(apkFilePath, projectDir, args);

                // decompile APK
                if (decompileJava) {
                    await jadx.decompileAPK(apkFilePath, projectDir, jadxArgs);
                }
                // quark analysis
                if (quarkAnalysis) {
                    await Quark.analyzeAPK(apkFilePath, projectDir);
                }

                // Initialize project dir as git repo
                await git.initGitDir(projectDir, "Initial APKLab project");

                // open project dir in a new window
                if (!process.env["TEST"]) {
                    await commands.executeCommand(
                        "vscode.openFolder",
                        Uri.file(projectDir),
                        true
                    );
                }
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
        const quickPickItems = await showArgsQuickPick(
            quickPickUtil.getQuickPickItems("rebuildQuickPickItems"),
            "Additional Apktool arguments"
        );
        const args = quickPickItems
            ? quickPickItems.map<string>((item) => item.label)
            : undefined;
        if (args) {
            await apktool.rebuildAPK(apktoolYmlPath, args);
        }
    }
}

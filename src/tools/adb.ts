import * as path from "path";
import { executeProcess } from "../utils/executor";

export namespace adb {
    /**
     * Installs the selected APK file to connected android device over ADB.
     * @param apkFilePath absolute path of the APK file.
     */
    export async function installAPK(apkFilePath: string): Promise<void> {
        const apkFileName = path.basename(apkFilePath);
        const report = `Installing ${apkFileName}`;
        const args = ["install", "-r", apkFilePath];
        await executeProcess({
            name: "Installing",
            report: report,
            command: "adb",
            args: args,
        });
    }
}

import * as fs from "fs";
import * as path from "path";
import { outputChannel } from "../data/constants";
import { executeProcess } from "../utils/executor";

export namespace git {
    /**
     * Initialize a directory as **Git** repository.
     * @param projectDir project output dir for decode/decompile/analysis.
     * @param commitMsg Message for initial commit.
     */
    export async function initGitDir(
        projectDir: string,
        commitMsg: string,
    ): Promise<void> {
        try {
            // .gitignore content
            const gitignore = "/build\n/dist\n";
            await fs.promises.writeFile(
                path.join(projectDir, ".gitignore"),
                gitignore,
            );
            await process.chdir(projectDir);
            let initCmd = `git init && git config core.safecrlf false`;
            initCmd += ` && git add -A && git commit -q -m "${commitMsg}"`;
            const report = `Initializing ${projectDir} as Git repository`;
            await executeProcess({
                name: "Initializing Git",
                report: report,
                command: initCmd,
                args: [],
                shell: true,
            });
        } catch (err: any) {
            outputChannel.appendLine(
                `Error: Initializing project dir as Git repository: ${err.message}`,
            );
        }
    }
}

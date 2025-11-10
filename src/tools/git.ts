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
        if (!projectDir || !fs.existsSync(projectDir)) {
            outputChannel.appendLine(
                `Error: Project directory does not exist: ${projectDir}`,
            );
            return;
        }

        if (!commitMsg || commitMsg.trim().length === 0) {
            commitMsg = "Initial commit";
        }

        try {
            // .gitignore content - ignore build artifacts
            const gitignore = "/build\n/dist\n";
            await fs.promises.writeFile(
                path.join(projectDir, ".gitignore"),
                gitignore,
            );

            // Initialize git repository
            // Change to project directory for git commands
            const originalDir = process.cwd();

            try {
                process.chdir(projectDir);

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
            } finally {
                // Always restore original directory, even on error
                process.chdir(originalDir);
            }
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : String(err);
            outputChannel.appendLine(
                `Error: Initializing project dir as Git repository: ${errorMessage}`,
            );
        }
    }
}

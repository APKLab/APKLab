import * as fs from "fs";
import * as path from "path";

export async function copyDirectory(src: string, dest: string): Promise<void> {
    try {
        await fs.promises.access(dest, fs.constants.F_OK);
    } catch (error) {
        await fs.promises.mkdir(dest, { recursive: true });
    }

    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await fs.promises.copyFile(srcPath, destPath);
        }
    }
}

export function getFullBaseName(filePath: string, directory: string): string {
    const parsedPath = path.parse(filePath);
    const pathNoExt = path.join(parsedPath.dir, parsedPath.name);

    const baseName = pathNoExt.replace(directory, "");
    return baseName.substring(1);
}

export function stripLeadingDir(filePath: string): string {
    const baseParts = filePath.split("/");
    const filteredPathParts = baseParts.filter((part) => part !== "");

    filteredPathParts.shift();
    return filteredPathParts.join("/");
}

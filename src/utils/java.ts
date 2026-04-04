import { workspace } from "vscode";
import { extensionConfigName } from "../data/constants";

/**
 * Get the configured Java executable path.
 * Uses `apklab.javaPath` setting, falling back to `"java"`.
 */
export function getJavaPath(): string {
    const config = workspace.getConfiguration(extensionConfigName);
    return config.get<string>("javaPath") || "java";
}

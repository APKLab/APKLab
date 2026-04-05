import * as fs from "fs";

/**
 * Find the main (launcher) activity from AndroidManifest.xml.
 * Looks for the activity with MAIN action + LAUNCHER category intent filter.
 * Returns the fully qualified class name (e.g. "com.example.MainActivity") or null.
 */
export function findMainActivity(manifestPath: string): string | null {
    const content = fs.readFileSync(manifestPath, "utf-8");

    // Find all <activity> blocks with their intent-filters
    // We use a simple regex approach since AndroidManifest is not deeply nested
    const activityRegex =
        /<activity[^>]*android:name="([^"]+)"[^]*?<\/activity>/g;

    let match: RegExpExecArray | null;
    while ((match = activityRegex.exec(content)) !== null) {
        const block = match[0];
        const activityName = match[1];

        // Check for MAIN + LAUNCHER intent filter
        const hasMainAction = block.includes("android.intent.action.MAIN");
        const hasLauncherCategory = block.includes(
            "android.intent.category.LAUNCHER",
        );

        if (hasMainAction && hasLauncherCategory) {
            return resolveActivityName(content, activityName);
        }
    }

    return null;
}

/**
 * Resolve a potentially relative activity name to fully qualified.
 * ".MainActivity" with package "com.example" -> "com.example.MainActivity"
 */
function resolveActivityName(
    manifestContent: string,
    activityName: string,
): string {
    if (!activityName.startsWith(".")) {
        // Check if it's just a class name without package
        if (!activityName.includes(".")) {
            const pkg = getPackageName(manifestContent);
            return pkg ? `${pkg}.${activityName}` : activityName;
        }
        return activityName;
    }

    const pkg = getPackageName(manifestContent);
    return pkg ? `${pkg}${activityName}` : activityName;
}

/**
 * Extract package name from manifest.
 */
function getPackageName(manifestContent: string): string | null {
    const match = manifestContent.match(/<manifest[^>]*package="([^"]+)"/);
    return match ? match[1] : null;
}

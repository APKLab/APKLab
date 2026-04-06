import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { findMainActivity } from "../../utils/manifest";

describe("Manifest Utility Tests", function () {
    let tmpDir: string;

    beforeEach(function () {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-test-"));
    });

    afterEach(function () {
        fs.rmSync(tmpDir, { recursive: true });
    });

    function writeManifest(content: string): string {
        const manifestPath = path.join(tmpDir, "AndroidManifest.xml");
        fs.writeFileSync(manifestPath, content);
        return manifestPath;
    }

    it("finds fully qualified main activity", function () {
        const manifest = writeManifest(`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app">
    <application>
        <activity android:name="com.example.app.MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`);
        assert.strictEqual(
            findMainActivity(manifest),
            "com.example.app.MainActivity",
        );
    });

    it("resolves relative activity name with dot prefix", function () {
        const manifest = writeManifest(`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app">
    <application>
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`);
        assert.strictEqual(
            findMainActivity(manifest),
            "com.example.app.MainActivity",
        );
    });

    it("resolves bare class name without package", function () {
        const manifest = writeManifest(`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app">
    <application>
        <activity android:name="MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`);
        assert.strictEqual(
            findMainActivity(manifest),
            "com.example.app.MainActivity",
        );
    });

    it("returns null when no launcher activity exists", function () {
        const manifest = writeManifest(`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app">
    <application>
        <activity android:name="com.example.app.SettingsActivity">
            <intent-filter>
                <action android:name="android.intent.action.VIEW"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`);
        assert.strictEqual(findMainActivity(manifest), null);
    });

    it("picks correct activity among multiple", function () {
        const manifest = writeManifest(`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app">
    <application>
        <activity android:name="com.example.app.SplashActivity">
            <intent-filter>
                <action android:name="android.intent.action.VIEW"/>
            </intent-filter>
        </activity>
        <activity android:name="com.example.app.MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`);
        assert.strictEqual(
            findMainActivity(manifest),
            "com.example.app.MainActivity",
        );
    });
});

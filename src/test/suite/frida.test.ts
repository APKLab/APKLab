import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { _testing } from "../../tools/frida";

const {
    smaliTypeToJava,
    parseSmaliParams,
    parseMethodFromLine,
    generateFridaHook,
    detectArchFromFilename,
    findSmaliFile,
    patchSmaliWithGadgetLoad,
    generateGadgetName,
    GADGET_INJECT_MARKER,
} = _testing;

describe("Frida Tool Tests", function () {
    describe("smaliTypeToJava", function () {
        it("converts primitive types", function () {
            assert.strictEqual(smaliTypeToJava("V"), "void");
            assert.strictEqual(smaliTypeToJava("Z"), "boolean");
            assert.strictEqual(smaliTypeToJava("B"), "byte");
            assert.strictEqual(smaliTypeToJava("S"), "short");
            assert.strictEqual(smaliTypeToJava("C"), "char");
            assert.strictEqual(smaliTypeToJava("I"), "int");
            assert.strictEqual(smaliTypeToJava("J"), "long");
            assert.strictEqual(smaliTypeToJava("F"), "float");
            assert.strictEqual(smaliTypeToJava("D"), "double");
        });

        it("converts object types", function () {
            assert.strictEqual(
                smaliTypeToJava("Ljava/lang/String;"),
                "java.lang.String",
            );
            assert.strictEqual(
                smaliTypeToJava("Lcom/example/Foo;"),
                "com.example.Foo",
            );
        });

        it("preserves array notation", function () {
            assert.strictEqual(smaliTypeToJava("[B"), "[B");
            assert.strictEqual(smaliTypeToJava("[I"), "[I");
            assert.strictEqual(
                smaliTypeToJava("[Ljava/lang/String;"),
                "[Ljava/lang/String;",
            );
        });
    });

    describe("parseSmaliParams", function () {
        it("parses empty params", function () {
            assert.deepStrictEqual(parseSmaliParams(""), []);
        });

        it("parses single primitive", function () {
            assert.deepStrictEqual(parseSmaliParams("I"), ["I"]);
        });

        it("parses multiple primitives", function () {
            assert.deepStrictEqual(parseSmaliParams("IZD"), ["I", "Z", "D"]);
        });

        it("parses object type", function () {
            assert.deepStrictEqual(parseSmaliParams("Ljava/lang/String;"), [
                "Ljava/lang/String;",
            ]);
        });

        it("parses mixed types", function () {
            assert.deepStrictEqual(
                parseSmaliParams("ILjava/lang/String;Z"),
                ["I", "Ljava/lang/String;", "Z"],
            );
        });

        it("parses array types", function () {
            assert.deepStrictEqual(parseSmaliParams("[B"), ["[B"]);
            assert.deepStrictEqual(parseSmaliParams("[Ljava/lang/String;"), [
                "[Ljava/lang/String;",
            ]);
        });
    });

    describe("parseMethodFromLine", function () {
        it("parses public method", function () {
            const result = parseMethodFromLine(
                ".method public doWork(ILjava/lang/String;)V",
                "com/example/Foo",
            );
            assert.ok(result);
            assert.strictEqual(result.methodName, "doWork");
            assert.strictEqual(result.returnType, "V");
            assert.strictEqual(result.isStatic, false);
            assert.strictEqual(result.isConstructor, false);
            assert.deepStrictEqual(result.paramTypes, [
                "I",
                "Ljava/lang/String;",
            ]);
        });

        it("parses static method", function () {
            const result = parseMethodFromLine(
                ".method public static helper()I",
                "com/example/Foo",
            );
            assert.ok(result);
            assert.strictEqual(result.isStatic, true);
        });

        it("parses constructor", function () {
            const result = parseMethodFromLine(
                ".method public constructor <init>()V",
                "com/example/Foo",
            );
            assert.ok(result);
            assert.strictEqual(result.isConstructor, true);
            assert.strictEqual(result.methodName, "<init>");
        });

        it("returns null for non-method lines", function () {
            const result = parseMethodFromLine(
                ".field public name:Ljava/lang/String;",
                "com/example/Foo",
            );
            assert.strictEqual(result, null);
        });
    });

    describe("generateFridaHook", function () {
        it("generates constructor hook", function () {
            const hook = generateFridaHook({
                className: "com.example.Foo",
                methodName: "<init>",
                paramTypes: ["I"],
                returnType: "V",
                isStatic: false,
                isConstructor: true,
            });
            assert.ok(hook.includes("Java.perform"));
            assert.ok(hook.includes("$init"));
            assert.ok(hook.includes("com.example.Foo"));
        });

        it("generates regular method hook with return value", function () {
            const hook = generateFridaHook({
                className: "com.example.Foo",
                methodName: "getName",
                paramTypes: [],
                returnType: "Ljava/lang/String;",
                isStatic: false,
                isConstructor: false,
            });
            assert.ok(hook.includes("getName"));
            assert.ok(hook.includes("return ret"));
        });

        it("generates void method hook", function () {
            const hook = generateFridaHook({
                className: "com.example.Foo",
                methodName: "doWork",
                paramTypes: [],
                returnType: "V",
                isStatic: false,
                isConstructor: false,
            });
            assert.ok(hook.includes("doWork"));
            assert.ok(!hook.includes("return ret"));
        });
    });

    describe("detectArchFromFilename", function () {
        it("detects arm64", function () {
            assert.strictEqual(
                detectArchFromFilename(
                    "/path/frida-gadget-arm64.so",
                ),
                "arm64-v8a",
            );
        });

        it("detects arm", function () {
            assert.strictEqual(
                detectArchFromFilename("/path/frida-gadget-arm.so"),
                "armeabi-v7a",
            );
        });

        it("detects x86_64", function () {
            assert.strictEqual(
                detectArchFromFilename(
                    "/path/frida-gadget-x86_64.so",
                ),
                "x86_64",
            );
        });

        it("detects x86", function () {
            assert.strictEqual(
                detectArchFromFilename("/path/frida-gadget-x86.so"),
                "x86",
            );
        });

        it("returns null for unknown", function () {
            assert.strictEqual(
                detectArchFromFilename("/path/gadget.so"),
                null,
            );
        });
    });

    describe("generateGadgetName", function () {
        it("generates unique names", function () {
            const names = new Set<string>();
            for (let i = 0; i < 10; i++) {
                names.add(generateGadgetName());
            }
            assert.strictEqual(
                names.size,
                10,
                "All generated names should be unique",
            );
        });

        it("produces ndk_ prefixed name", function () {
            const name = generateGadgetName();
            assert.ok(name.startsWith("ndk_"), `Expected ndk_ prefix, got: ${name}`);
        });
    });

    describe("findSmaliFile", function () {
        let tmpDir: string;

        beforeEach(function () {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "frida-test-"));
        });

        afterEach(function () {
            fs.rmSync(tmpDir, { recursive: true });
        });

        it("finds smali file in smali/ dir", function () {
            const smaliDir = path.join(tmpDir, "smali", "com", "example");
            fs.mkdirSync(smaliDir, { recursive: true });
            fs.writeFileSync(path.join(smaliDir, "Main.smali"), "");

            const result = findSmaliFile(tmpDir, "com.example.Main");
            assert.ok(result);
            assert.ok(result.endsWith("Main.smali"));
        });

        it("finds smali file in smali_classes2/ dir", function () {
            const smaliDir = path.join(
                tmpDir,
                "smali_classes2",
                "com",
                "example",
            );
            fs.mkdirSync(smaliDir, { recursive: true });
            fs.writeFileSync(path.join(smaliDir, "Helper.smali"), "");

            const result = findSmaliFile(tmpDir, "com.example.Helper");
            assert.ok(result);
            assert.ok(result.includes("smali_classes2"));
        });

        it("returns null for non-existent class", function () {
            const smaliDir = path.join(tmpDir, "smali");
            fs.mkdirSync(smaliDir, { recursive: true });

            const result = findSmaliFile(tmpDir, "com.example.Missing");
            assert.strictEqual(result, null);
        });
    });

    describe("patchSmaliWithGadgetLoad", function () {
        let tmpDir: string;

        beforeEach(function () {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "frida-patch-"));
        });

        afterEach(function () {
            fs.rmSync(tmpDir, { recursive: true });
        });

        it("patches onCreate with .locals directive", function () {
            const smaliContent = [
                ".class public Lcom/example/Main;",
                ".super Landroid/app/Activity;",
                "",
                ".method public onCreate(Landroid/os/Bundle;)V",
                "    .locals 2",
                "",
                "    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V",
                "    return-void",
                ".end method",
            ].join("\n");

            const smaliPath = path.join(tmpDir, "Main.smali");
            fs.writeFileSync(smaliPath, smaliContent);

            const result = patchSmaliWithGadgetLoad(smaliPath, "testgadget");
            assert.strictEqual(result, true);

            const patched = fs.readFileSync(smaliPath, "utf-8");
            assert.ok(patched.includes(GADGET_INJECT_MARKER));
            assert.ok(patched.includes('const-string v2, "testgadget"'));
            assert.ok(patched.includes(".locals 3"));
            assert.ok(
                patched.includes(
                    "invoke-static {v2}, Ljava/lang/System;->loadLibrary",
                ),
            );
        });

        it("patches onCreate with .registers directive", function () {
            const smaliContent = [
                ".class public Lcom/example/Main;",
                ".super Landroid/app/Activity;",
                "",
                ".method public onCreate(Landroid/os/Bundle;)V",
                "    .registers 5",
                "",
                "    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V",
                "    return-void",
                ".end method",
            ].join("\n");

            const smaliPath = path.join(tmpDir, "Main.smali");
            fs.writeFileSync(smaliPath, smaliContent);

            const result = patchSmaliWithGadgetLoad(smaliPath, "mygadget");
            assert.strictEqual(result, true);

            const patched = fs.readFileSync(smaliPath, "utf-8");
            // .registers 5 with 2 params = 3 locals (v0,v1,v2). New reg = v3
            assert.ok(patched.includes('const-string v3, "mygadget"'));
            assert.ok(patched.includes(".registers 6"));
        });

        it("skips already patched file", function () {
            const smaliContent = [
                ".class public Lcom/example/Main;",
                ".super Landroid/app/Activity;",
                "",
                ".method public onCreate(Landroid/os/Bundle;)V",
                "    .locals 3",
                "",
                `    ${GADGET_INJECT_MARKER}`,
                '    const-string v2, "oldgadget"',
                "",
                "    invoke-static {v2}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V",
                "",
                "    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V",
                "    return-void",
                ".end method",
            ].join("\n");

            const smaliPath = path.join(tmpDir, "Main.smali");
            fs.writeFileSync(smaliPath, smaliContent);

            const result = patchSmaliWithGadgetLoad(smaliPath, "newgadget");
            assert.strictEqual(result, false, "Should not patch again");

            const content = fs.readFileSync(smaliPath, "utf-8");
            assert.ok(!content.includes("newgadget"));
        });

        it("returns false when no onCreate exists", function () {
            const smaliContent = [
                ".class public Lcom/example/Helper;",
                ".super Ljava/lang/Object;",
                "",
                ".method public doWork()V",
                "    .locals 1",
                "    return-void",
                ".end method",
            ].join("\n");

            const smaliPath = path.join(tmpDir, "Helper.smali");
            fs.writeFileSync(smaliPath, smaliContent);

            const result = patchSmaliWithGadgetLoad(smaliPath, "gadget");
            assert.strictEqual(result, false);
        });
    });
});

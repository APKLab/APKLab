import * as xml from 'xml-js';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import * as globby from 'globby';
import * as escapeStringRegexp from 'escape-string-regexp';

const DEFAULT_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <debug-overrides>
        <trust-anchors>
            <certificates src="user" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>`;

const INTERFACE_LINE = '.implements Ljavax/net/ssl/X509TrustManager;';

/** The methods that need to be patched to disable certificate pinning. */
const METHOD_SIGNATURES = [
    'checkClientTrusted([Ljava/security/cert/X509Certificate;Ljava/lang/String;)V',
    'checkServerTrusted([Ljava/security/cert/X509Certificate;Ljava/lang/String;)V',
    'getAcceptedIssuers()[Ljava/security/cert/X509Certificate;',
];

/** Patterns used to find the methods defined in `METHOD_SIGNATURES`. */
const METHOD_PATTERNS = METHOD_SIGNATURES.map(signature => {
    const escapedSignature = escapeStringRegexp(signature);
    return new RegExp(
        `(\\.method public (?:final )?${escapedSignature})\\n([^]+?)\\n(\\.end method)`,
        'g',
    );
});

/** Code inserted into `checkClientTrusted` and `checkServerTrusted`. */
const RETURN_VOID_FIX = [
    '.locals 0',
    'return-void',
];

/** Code inserted into `getAcceptedIssuers`. */
const RETURN_EMPTY_ARRAY_FIX = [
    '.locals 1',
    'const/4 v0, 0x0',
    'new-array v0, v0, [Ljava/security/cert/X509Certificate;',
    'return-object v0',
];

async function getNscFromManifest(manifestPath: string) {
    const manifestContent = await fs.promises.readFile(manifestPath, { encoding: 'utf-8' });

    const fileXml: { [index: string]: any } = xml.xml2js(manifestContent, { compact: true, alwaysArray: true });

    const manifest = fileXml['manifest'][0];
    const application = manifest['application'][0];

    let nscName = 'network_security_config';
    const nscReference: string = application._attributes['android:networkSecurityConfig'];
    if (nscReference && nscReference.startsWith('@xml/')) {
        nscName = nscReference.slice(5);
    } else {
        application._attributes['android:networkSecurityConfig'] = `@xml/${nscName}`;
    }

    await fs.promises.writeFile(manifestPath, xml.js2xml(fileXml, { compact: true, spaces: 4 }));

    return nscName;
}

async function modifyNetworkSecurityConfig(nscPath: string) {

    try {
        const fileStat = await fs.promises.stat(nscPath);
        console.log('file stat here');
        console.log(fileStat);

        const fileContent = await fs.promises.readFile(nscPath, { encoding: 'utf-8' });

        const fileXml: { [index: string]: any } = xml.xml2js(fileContent, { compact: true, alwaysArray: true });

        const config = fileXml['network-security-config'][0];

        // Remove certificate pinning rules
        // See https://developer.android.com/training/articles/security-config#pin-set
        delete config['pin-set'];

        const overrides = (config['debug-overrides'] || (config['debug-overrides'] = [{}]))[0];
        const trustAnchors = (overrides['trust-anchors'] || (overrides['trust-anchors'] = [{}]))[0];
        const certificates = trustAnchors['certificates'] || (trustAnchors['certificates'] = []);

        if (!certificates.filter((c: any) => c._attributes.src === 'user').length) {
            certificates.push({ _attributes: { src: 'user' } });
        }

        await fs.promises.writeFile(nscPath, xml.js2xml(fileXml, { compact: true, spaces: 4 }));
    }
    catch (err) {
        console.log(err);
        if (err.includes('ENOENT')) {
            // File does not exist, create a default one
            await fs.promises.mkdir(path.dirname(nscPath), { recursive: true });
            await fs.promises.writeFile(nscPath, DEFAULT_CONFIG);
        }
    }
}

async function disableCertificatePinning(directoryPath: string) {

    try {

        const smaliFiles = await globby(path.posix.join(directoryPath, 'smali*/**/*.smali'));

        let pinningFound = false;

        for (const filePath of smaliFiles) {
            // observer.next(`Scanning ${path.basename(filePath)}...`)

            const originalContent = await fs.promises.readFile(filePath, 'utf-8');

            // Don't scan classes that don't implement the interface
            if (!originalContent.includes(INTERFACE_LINE)) {
                continue;
            }

            let patchedContent = originalContent;

            for (const pattern of METHOD_PATTERNS) {
                patchedContent = patchedContent.replace(pattern, (_, openingLine: string, body: string, closingLine: string) => {

                    const bodyLines = body.split('\n').map(line => line.replace(/^    /, ''));

                    const fixLines = openingLine.includes('getAcceptedIssuers') ? RETURN_EMPTY_ARRAY_FIX : RETURN_VOID_FIX;

                    const patchedBodyLines = [
                        '# inserted by APKLab to disable certificate pinning',
                        ...fixLines,
                        '',
                        '# commented out by APKLab to disable old method body',
                        '# ',
                        ...bodyLines.map(line => `# ${line}`)
                    ];

                    return [openingLine, ...patchedBodyLines.map(line => `    ${line}`), closingLine,].map(line => line.replace(/\s+$/, '')).join('\n');
                });
            }

            if (originalContent !== patchedContent) {
                pinningFound = true;
                await fs.promises.writeFile(filePath, patchedContent);
            }

        }

        if (!pinningFound) {
            console.log('No certificate pinning logic found.');
        }
    }
    catch (err) {
        console.log(err);
    }
}

export namespace mitmTools {

    /**
     * Apply patch to intercept HTTPS calls
     * @param apktoolYmlPath The path of `apktool.yml` file.
     */
    export async function applyMitmPatch(apktoolYmlPath: string) {
        // console.log('base path: ' + path.dirname(apktoolYmlPath));
        const decodeDir = path.dirname(apktoolYmlPath);
        const manifestPath = path.join(decodeDir, "AndroidManifest.xml");
        // console.log('Manifest path: ' + manifestPath);
        const nscName = await getNscFromManifest(manifestPath);
        const nscPath = path.join(decodeDir, `res/xml/${nscName}.xml`);
        console.log(nscName);
        console.log(nscPath);
        await modifyNetworkSecurityConfig(nscPath);
        await disableCertificatePinning(decodeDir);
    }

}

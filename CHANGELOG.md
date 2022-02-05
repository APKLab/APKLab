# Changelog

## [1.6.0] - 2022-02-05

### Added

- Jadx updated to v1.3.2
- (ci) more tests

### Fixed

- fixed an issue related to Windows `cd` command (thanks @Forgo7ten)
- (ci) attempt to fix quark tests on Windows (again!)
- (dev) fixed the webpack-problem-matcher extension name
- (dev) updated deps

## [1.5.0] - 2021-10-07

### Added

- apktool updated to v2.6.0
- apk-mitm updated to v1.1.0
- feat: auto update check for tools on startup
- (dev) use `yarn` instead of `npm`
- (ci) auto publish release on tag
- (ci) use yarn cache for faster builds
- (ci) migrate to nodejs v14

### Fixed

- fixed some bug/warning
- (dev) updated other dependencies

## [1.4.0] - 2021-04-11

### Added

- apk-mitm updated to v0.12.0
- New [GitHub Org](https://github.com/APKLab) and [website](https://apklab.surendrajat.xyz)
- Add 'show inconsistent code' arg to jadx (#127) (thanks @psolyca)
- Add deobfuscation args to jadx (#117) (thanks @psolyca)

### Fixed

- show quark analysis report on project open (#121)
- use common process executor for quark analysis (#125)
- refactor project src dir structure (#122)
- dep: bump dependencies (#128)
- CI: fix Quark analysis tests (#126)

## [1.3.1] - 2021-01-30

### Added

- apk-mitm updated to v0.11.1

## [1.3.0] - 2021-01-30

### Added

- Integrated [Quark-Engine](https://github.com/quark-engine/quark-engine) for Malware Analysis (thanks [Shaun Dang](https://github.com/pulorsok))
- Integrated [apk-mitm](https://github.com/shroudedcode/apk-mitm) natively (thanks [Niklas Higi](https://github.com/shroudedcode))
- Initialize project directory as Git repo (thanks [Aman](https://github.com/amsharma44))
- Add [**Smalise**](https://github.com/LoyieKing/Smalise) as an extension dependency
- Various code-quality improvements and integration tests

### Fixed

- Don't decode `assets/*.dex` by default (Apktool)

## [1.2.0] - 2020-12-20

### Added

- Apply MITM patch for HTTPS inspection
- Build APK in DEBUG mode
- Cleanup ApkTool Frameworks dir

### Fixed

- Improved error logs
- ApkTool update to v2.5.0
- Uber-APK-Signer update to v1.2.1
- Updated gifs for dark mode

## [1.1.1] - 2020-11-21

### Fixed

- Fixed a regression introduced in refactoring

## [1.1.0] - 2020-11-21

### Added

- Bundle extension with Webpack
- Updated Jadx version to v1.2.0

### Fixed

- Fixed a known issue related to first launch
- Refactored tools update function

## [1.0.1] - 2020-10-31

### Fixed

- Fixed path issues on Windows (thanks [Aman](https://github.com/amsharma44))
- Improved logging
- Updated README

## [1.0.0] - 2020-10-15

- Feature complete with [APK Studio](https://github.com/vaibhavpandeyvpz/apkstudio) 🎉🎉

### Added

- Support for user-provided keystore for APK signing
- Known issue about fist time use
- Switch to AGPL License

### Fixed

- README update
- Code refactoring

## [0.9.0] - 2020-10-13

### Added

- Decompile APK to Java source using **Jadx**
- Extension config for Jadx Dir
- Download and extract Jadx automatically
- README: added community support links

## [0.8.1] - 2020-09-11

### Added

- Added GitHub issue/feature-request templates
- Updated README

### Fixed

- Config was not immediately being updated after downloading tools
- Updated vulnerable library: lodash

## [0.8.0] - 2020-06-14

### Added

- Added support for most CLI arguments of **Apktool**
- Improved log output (print actual command, etc.)
- Reduced extension size (< 50KB)
- Improved README

### Fixed

- `Install the APK` visible in CommandPalette

## [0.7.0] - 2020-05-31

### Added

- `Install the APK` file to device using ADB
- Overwrite unsigned APK on reSigning

### Removed

- `javaPath` removed from settings (Windows path issue)

## [0.6.1] - 2020-05-30

### Added

- A cool project logo (thanks [@Feimaomii](https://github.com/Feimaomii))
- Some nice badges in README.md

### Fixed

- Don't check for dependencies at multiple places

## [0.6.0] - 2020-05-17

### Added

- Download and manage the dependencies: **`Apktool`**, **`uber-apk-signer`**

### Fixed

- use `java` path from config if defined

## [0.5.0] - 2020-05-13

### Added

- Improved error checking at each step
- Show useful notifications after each action

### Fixed

- `Open an APK` closes/replaces current workspace
- No logs being shown Output Channel

## [0.3.1] - 2020-05-11

### Fixed

- `Rebuild the APK` visible in commandPalette

## [0.3.0] - 2020-05-11

- Initial release

### Added

- DeAssemble/Decode APK file using **`Apktool`**
- Rebuild APK file (Context menu in `apktool.yml` file)
- Sign the rebuilt APK using **`uber-apk-signer`**

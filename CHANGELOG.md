# Changelog

## [Unreleased]

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

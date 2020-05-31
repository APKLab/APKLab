# Changelog

## [0.7.0] - 2020-05-31

### Added

- Install APK file to device using ADB
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

- `Rebuild the APK` always visible in commandPalette

## [0.3.0] - 2020-05-11

- Initial release

### Added

- DeAssemble/Decode APK file using **`Apktool`**
- Rebuild APK file (Context menu in `apktool.yml` file)
- Sign the rebuilt APK using **`uber-apk-signer`**

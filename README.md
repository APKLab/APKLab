<h1 align="center">
  <a href="https://apklab.surendrajat.xyz">
    <img src="https://raw.githubusercontent.com/APKLab/apklab/master/assets/icon.png" alt="APKLab" height="96px" width="100px">
  </a>
  <br>
  APKLab
</h1>

<h4 align="center">
The ultimate Android RE experience right inside your <a href="https://code.visualstudio.com/">VS Code</a>.
</h4>

<p align="center">
APKLab seamlessly integrates the best open-source tools: <a href='https://github.com/quark-engine/quark-engine'>Quark-Engine</a>, <a href="https://github.com/ibotpeaches/apktool/">Apktool</a>, <a href="https://github.com/skylot/jadx">Jadx</a>, <a href="https://github.com/patrickfav/uber-apk-signer">uber-apk-signer</a>, <a href="https://github.com/shroudedcode/apk-mitm/">apk-mitm</a> and more to the excellent VS Code so you can focus on app analysis and get it done without leaving the IDE.
</p>

<p align="center">
    <a href="https://github.com/APKLab/APKLab">
        <img alt="Version" src="https://img.shields.io/github/v/tag/APKLab/APKLab?label=latest&color=f0f0e0&labelColor=404752">
    </a>
    <a href="https://open-vsx.org/extension/Surendrajat/apklab">
        <img alt="Download" src="https://img.shields.io/static/v1?label=get%20from&message=open-vsx&color=629&labelColor=404752">
    </a>
    <a href="https://marketplace.visualstudio.com/items?itemName=Surendrajat.apklab">
        <img alt="Installs" src="https://img.shields.io/visual-studio-marketplace/i/surendrajat.apklab?logo=visual-studio-code&logoColor=blue&labelColor=404752&color=blue">
    </a>
    <a href="https://github.com/APKLab/APKLab/actions?query=workflow%3A%22CI%22">
        <img alt="CI" src="https://github.com/APKLab/APKLab/workflows/CI/badge.svg?branch=master&event=push">
    </a>
</p>
<p align="center">
    <a href="https://forum.xda-developers.com/t/4109409/">
        <img alt="XDA Developers" src="https://img.shields.io/badge/XDA%20Forums-ffb?logo=xda-developers">
    </a>
    <a href="https://t.me/apklab_re">
        <img alt="Telegram" src="https://img.shields.io/badge/telegram-eff?logo=telegram">
    </a>
    <a href="https://matrix.to/#/#apklab:matrix.org">
        <img alt="Matrix" src="https://img.shields.io/badge/matrix-f5faef?logo=matrix&logoColor=black">
    </a>
</p>

## Features

- Decode all the resources from an APK
- Disassemble the APK to Dalvik bytecode aka Smali
- Decompile the APK to Java source
- Malware Analysis using Quark-Engine
- Initialize project directory as Git repo
- Analyze & Hack effectively with feature-rich VS Code
- Apply MITM patch for HTTPS inspection
- Build an APK from Smali and resources
- Rebuild an APK in Debug mode for dynamic analysis
- Sign the APK seamlessly during the build
- Install the APK directly from VS Code
- Support for Apktool-style projects (`apktool.yml`)
- Support for most Apktool CLI arguments
- Android resource frameworks management (Coming soon!)
- Support for user-provided keystore for APK signing
- Download and configure missing dependencies
- Excellent Smali language support with [**Smalise**](https://github.com/LoyieKing/Smalise)
- Supports Linux, Windows, and Mac

## Getting Started

#### Open APK or Apktool project

- Open the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) ➜ <kbd>APKLab: Open an APK</kbd>

  ![decode.gif](https://github.com/APKLab/APKLab/raw/master/assets/decode.gif)

- Or Just open an existing Apktool project folder

#### Apply MITM patch

- Right-Click on or inside `apktool.yml` file ➜ <kbd>APKLab: Prepare for HTTPS inspection</kbd>

  ![mitm.gif](https://github.com/APKLab/APKLab/raw/master/assets/mitm.gif)

#### ReBuild and Sign APK

- Right-Click on or inside `apktool.yml` file ➜ <kbd>APKLab: Rebuild the APK</kbd>

  ![rebuild.gif](https://github.com/APKLab/APKLab/raw/master/assets/rebuild.gif)

#### Install APK to device

- Right-Click on `.apk` file (in `dist` directory) ➜ <kbd>APKLab: Install the APK</kbd>

  ![install.gif](https://github.com/APKLab/APKLab/raw/master/assets/install.gif)

#### Clean ApkTool frameworks dir

- Open the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) ➜ <kbd>APKLab: Empty ApkTool Framework Dir</kbd>

## Requirements

- **JDK 8+**
  > Run **`java -version`** in your Shell, if not found, download from [here](https://adoptopenjdk.net/).
- **adb**

  > Run **`adb devices`** in your Shell, if not found, check [this guide](https://www.xda-developers.com/install-adb-windows-macos-linux/).

- **quark-engine >=21.01.6** (for malware analysis)
  > Run **`quark`** in your Shell, if not found, check [official docs](https://github.com/quark-engine/quark-engine).

## Extension Settings

<details>
  <summary>Dependency Paths</summary>

- **`apklab.apktoolPath`**: Full Path of `apktool.jar`. If you want to use a different version of it, change it like:

  `"apklab.apktoolPath": "/home/oozer/downloads/apktool_2.4.1.jar"`

- **`apklab.apkSignerPath`**: Full Path of `uber-apk-signer.jar`. If you want to use a different version of it, change it like:

  `"apklab.apkSignerPath": "/home/oozer/downloads/uber-apk-signer-1.1.0.jar"`

- **`apklab.jadxDirPath`**: Full Path of `jadx-x.y.z` dir. If you want to use a different version of it, change it like:

  `"apklab.jadxDirPath": "/home/oozer/downloads/jadx-1.1.0"`

</details>
<details>
  <summary>Keystore configuration</summary>

- **`apklab.keystorePath`**: Put the absolute path of your **Java keystore**(`.jks` or `.keystore`) file here.

  `"apklab.keystorePath": "/home/oozer/downloads/debug.keystore"`

- **`apklab.keystorePassword`**: Put the **password** of your keystore here.

- **`apklab.keyAlias`**: Put the **alias** of the used key in the keystore here.

- **`apklab.keyPassword`**: Put the **password** of the used key in the keystore here.

</details>

<details>
  <summary>Additional configuration</summary>

- **`apklab.initProjectDirAsGit`**: Initialize project output directory as **Git** repository.

</details>

## Known Issues

## Contribution Guide

For bug reports, feature requests or simply discussing an idea, please open an issue [here](https://github.com/APKLab/APKLab/issues). PRs are always welcome.

## [Changelog](https://github.com/APKLab/APKLab/blob/master/CHANGELOG.md)

## Credits

- [Feimaomii](https://github.com/Feimaomii) for the awesome logo
- [Aman Sharma](https://github.com/amsharma44) for active contribution
- [Niklas Higi](https://github.com/shroudedcode) for apk-mitm
- [Shaun Dang](https://github.com/pulorsok), [JunWei Song](https://github.com/krnick) & [KunYu Chen](https://github.com/18z) for Quark-Engine
- [iBotPeaches](https://github.com/iBotPeaches), [brutall](https://github.com/brutall) and [JesusFreke](https://github.com/JesusFreke) for Apktool & Smali
- [patrickfav](https://github.com/patrickfav) for uber-apk-signer
- [skylot](https://github.com/skylot) for Jadx
- [Loyie King](https://github.com/LoyieKing) for Smalise

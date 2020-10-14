<h1 align="center">
  <a href="https://github.com/surendrajat/apklab">
    <img src="https://raw.githubusercontent.com/surendrajat/apklab/master/assets/icon.png" alt="APK Lab" height="96px" width="100px">
  </a>
  <br>
  APK Lab
</h1>

<h4 align="center">
The ultimate android static analysis and RE experience right inside your <a href="https://code.visualstudio.com/">VS Code</a>.
</h4>

<p align="center">
APKLab seamlessly integrates the best open-source tools: <a href="https://github.com/ibotpeaches/apktool/">Apktool</a>, <a href="https://github.com/skylot/jadx">Jadx</a>, <a href="https://github.com/patrickfav/uber-apk-signer">uber-apk-signer</a> and more to the excellent VS Code so you can focus on app analysis and get it done without leaving the IDE.
</p>

<p align="center">
    <a href="https://marketplace.visualstudio.com/items?itemName=Surendrajat.apklab">
        <img alt="Version" src="https://img.shields.io/visual-studio-marketplace/v/surendrajat.apklab?color=629&labelColor=000">
    </a>
    <a href="https://marketplace.visualstudio.com/items?itemName=Surendrajat.apklab">
        <img alt="Installs" src="https://img.shields.io/visual-studio-marketplace/i/surendrajat.apklab?logo=visual-studio-code&logoColor=blue&labelColor=000&color=blue">
    </a>
    <a href="https://github.com/Surendrajat/APKLab/actions?query=workflow%3AAPKLab">
        <img alt="GitHub Workflow Status (master)" src="https://img.shields.io/github/workflow/status/surendrajat/apklab/APKLab/master?logo=github&labelColor=black">
    </a>
</p>

## Features

- Decode all the resources from android app
- Disassemble android app to dalvik bytecode aka smali
- Decompile android app to Java source
- Analyze & Hack effectively with feature rich VS Code
- Build an APK from smali and resources
- Sign the APK seamlessly during build
- Install the APK directly from VS Code
- Support for Apktool-style projects
- Support for most Apktool cli arguments
- Android resource frameworks management (Coming soon!)
- Configure your own app signing certificate (Coming soon!)
- Download and configure missing dependencies
- Excellent smali language support with [**Smalise**](https://marketplace.visualstudio.com/items?itemName=LoyieKing.smalise)
- Supports Linux, Windows and Mac

## Getting Started

#### Open APK or Apktool project

- Open the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) ➜ <kbd>APKLab: Open an APK</kbd>

  ![decode.gif](https://github.com/Surendrajat/APKLab/raw/master/assets/decode.gif)

- Or Just open an existing Apktool project folder

#### ReBuild and Sign APK
  
- Right-Click on or inside `apktool.yml` file ➜ <kbd>APKLab: Rebuild the APK</kbd>

  ![rebuild.gif](https://github.com/Surendrajat/APKLab/raw/master/assets/rebuild.gif)

#### Install APK to device
  
- Right-Click on `.apk` file (in `dist` directory) ➜ <kbd>APKLab: Install the APK</kbd>

  ![install.gif](https://github.com/Surendrajat/APKLab/raw/master/assets/install.gif)

## Requirements

- **JDK 8+**
  >Run **`java -version`** in your Shell, if not found download from [here](https://adoptopenjdk.net/).
- **adb**
  >Run **`adb devices`** in your Shell, if not found check [this guide](https://www.xda-developers.com/install-adb-windows-macos-linux/).

- [**Smalise**](https://marketplace.visualstudio.com/items?itemName=LoyieKing.smalise) (recommended)
  >It makes working with `smali` files a breeze.

## Extension Settings

- **`apklab.apktoolPath`**: Full Path of `apktool.jar`. If you're using different version of it, change it like:

  `"apklab.apktoolPath": "/home/oozer/downloads/apktool_2.4.1.jar"`

- **`apklab.apkSignerPath`**: Full Path of `uber-apk-signer.jar`. If you're using different version of it, change it like:

  `"apklab.apkSignerPath": "/home/oozer/downloads/uber-apk-signer-1.1.0.jar"`

- **`apklab.jadxDirPath`**: Full Path of `jadx-x.y.z` dir. If you're using different version of it, change it like:
  
  `"apklab.jadxDirPath": "/home/oozer/downloads/jadx-1.1.0"`

## Known Issues

- First time when you try <kbd>APKLab: Open an APK</kbd>, the dependencies will be downloaded and settings will be updated. However, you may need to restart VS Code once, on download completion, for the settings to be applied.

## Contribution Guide

  For bug report, feature request or simply discussing an idea, please open an issue [here](https://github.com/Surendrajat/APKLab/issues). PRs are always welcome.

## Community support

[![telegram](https://img.shields.io/badge/telegram-group-blue)](https://t.me/apklab_re) [![matrix-room](https://img.shields.io/badge/matrix-room-red)](https://matrix.to/#/#apklab:matrix.org)

## [Changelog](https://github.com/Surendrajat/APKLab/blob/master/CHANGELOG.md)

## Credits

- [Feimaomii](https://github.com/Feimaomii) for the awesome logo
- [iBotPeaches](https://github.com/iBotPeaches), [brutall](https://github.com/brutall) and [JesusFreke](https://github.com/JesusFreke) for Apktool & Smali
- [patrickfav](https://github.com/patrickfav) for uber-apk-signer
- [skylot](https://github.com/skylot) for Jadx

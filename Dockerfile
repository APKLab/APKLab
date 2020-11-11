# Download the Required Hacking Tools
FROM alpine:latest as alpine-downloader

ENV HACKTOOLS_DIR=/root/.apklab

WORKDIR $HACKTOOLS_DIR

# Install adb tools, unzip, wget, signapk and apktool
RUN apk add wget unzip

# Install SignApk
RUN wget --no-check-certificate --quiet -O $HACKTOOLS_DIR/uber-apk-signer-1.1.0.jar https://github.com/patrickfav/uber-apk-signer/releases/download/v1.1.0/uber-apk-signer-1.1.0.jar

# Install jadx
RUN wget --no-check-certificate --quiet https://github.com/skylot/jadx/releases/download/v1.1.0/jadx-1.1.0.zip && \
    mkdir -p $HACKTOOLS_DIR/jadx && \
    unzip jadx-1.1.0.zip -d $HACKTOOLS_DIR/jadx && rm jadx-1.1.0.zip

# Download apktool-2 & Rename downloaded jar to apktool.jar
RUN wget --no-check-certificate --quiet -O $HACKTOOLS_DIR/apktool_2.4.1.jar https://bitbucket.org/iBotPeaches/apktool/downloads/apktool_2.4.1.jar



# Pull Ubuntu LTS image.
FROM shostarson/base-dev-env:v1

# Labels and Credits
LABEL \
    name="Apk Lab Env" \
    author="Rémi Lavedrine <twitter.com/shostarsson>" \
    maintainer="Rémi Lavedrine <twitter.com/shostarsson>" \
    description="A Docker Container that has everything ready to use the APKLab VSCode extension in a Dev Container."

ENV SRC_DIR=/root/home/apkLab-Results
ENV HACKTOOLS_DIR=/root/.apklab

ENV APKTOOL=apktool_2.4.1.jar
ENV UBER_APK_SIGNER=uber-apk-signer-1.1.0.jar

WORKDIR $SRC_DIR

COPY ./*.apk $SRC_DIR

# Install adb tools, unzip, wget, signapk and apktool
RUN apt update -y && apt install -y --no-install-recommends \
    openjdk-8-jdk \
    usbutils \
    unzip \
    wget \
    android-tools-adb \
    bash-completion \
    gcc


# Copy uber-apk-signer
COPY --from=alpine-downloader $HACKTOOLS_DIR/$UBER_APK_SIGNER $HACKTOOLS_DIR/$UBER_APK_SIGNER
RUN chmod +x $HACKTOOLS_DIR/$UBER_APK_SIGNER

# Copy apktool
COPY --from=alpine-downloader $HACKTOOLS_DIR/$APKTOOL $HACKTOOLS_DIR/$APKTOOL
RUN chmod +x $HACKTOOLS_DIR/$APKTOOL

# Copy jadx
COPY --from=alpine-downloader $HACKTOOLS_DIR/jadx/bin/jadx $HACKTOOLS_DIR/jadx
RUN chmod +x $HACKTOOLS_DIR/jadx


RUN mkdir -p $SRC_DIR/.vscode/ && \
    echo "{\n\t\"apklab.apktoolPath\": \"/root/.apklab/apktool_2.4.1.jar\",\n\t\"apklab.jadxDirPath\": \"/root/.apklab/jadx-1.1.0\",\n\t\"apklab.apkSignerPath\": \"/root/.apklab/uber-apk-signer-1.1.0.jar\"\n}" >> $SRC_DIR/.vscode/settings.json
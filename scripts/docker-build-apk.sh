#!/bin/bash
# Docker 内 APK 构建脚本

set -e

BUILD_TYPE=${1:-debug}

echo "🚀 开始在 Docker 中构建 Android APK..."
echo "📦 构建类型: $BUILD_TYPE"

cd /app/frontend/android

if [ "$BUILD_TYPE" = "release" ]; then
    echo "🏗️  构建 Release APK..."
    ./gradlew assembleRelease
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
else
    echo "🏗️  构建 Debug APK..."
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

if [ -f "$APK_PATH" ]; then
    echo "✅ APK 构建成功!"
    echo "📍 APK 位置: /app/frontend/android/$APK_PATH"
    
    # 复制到输出目录
    mkdir -p /output
    cp "$APK_PATH" /output/
    echo "📤 APK 已复制到: /output/$(basename $APK_PATH)"
    
    # 显示 APK 信息
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo "📊 APK 大小: $APK_SIZE"
else
    echo "❌ APK 构建失败!"
    exit 1
fi

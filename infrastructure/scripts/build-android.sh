#!/bin/bash
set -e

echo "========================================================"
echo "      VOZTRI - Compilação Automatizada Android Release"
echo "========================================================"

cd apps/driver-mobile/android

echo "[1/3] Limpando build anterior..."
./gradlew clean

echo "[2/3] Gerando APK de Release..."
./gradlew assembleRelease

echo "[3/3] Gerando Android App Bundle (AAB para Google Play)..."
./gradlew bundleRelease

echo "========================================================"
echo "Build concluído com sucesso!"
echo "APK gerado em: apps/driver-mobile/android/app/build/outputs/apk/release/"
echo "AAB gerado em: apps/driver-mobile/android/app/build/outputs/bundle/release/"
echo "========================================================"


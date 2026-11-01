@echo off
echo ========================================================
echo       VOZTRI - Compilacao Automatizada Android Release
echo ========================================================

cd apps\driver-mobile\android
if %errorlevel% neq 0 (
    echo Erro ao acessar diretorio android.
    exit /b %errorlevel%
)

echo [1/3] Limpando build anterior...
call gradlew.bat clean

echo [2/3] Gerando APK de Release...
call gradlew.bat assembleRelease

echo [3/3] Gerando Android App Bundle (AAB para Google Play)...
call gradlew.bat bundleRelease

echo ========================================================
echo Build concluido com sucesso!
echo APK gerado em: apps\driver-mobile\android\app\build\outputs\apk\release\
echo AAB gerado em: apps\driver-mobile\android\app\build\outputs\bundle\release\
echo ========================================================

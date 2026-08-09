$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Push-Location "$Root/frontend"

npm install
npm run build

if (-not (Test-Path "android")) {
    npx cap add android
}

npx cap sync android

Write-Host "Proyecto Android sincronizado." -ForegroundColor Green
Write-Host "Abriendo Android Studio para compilar APK/AAB..." -ForegroundColor Cyan
npx cap open android

Pop-Location

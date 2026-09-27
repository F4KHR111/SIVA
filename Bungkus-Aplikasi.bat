@echo off
title Bungkus Aplikasi Inventaris
echo Menyiapkan folder distribusi (siap dibagikan)...

:: 1. Buat folder dist baru
if exist "%~dp0Dist-Inventaris" rd /s /q "%~dp0Dist-Inventaris"
mkdir "%~dp0Dist-Inventaris"
mkdir "%~dp0Dist-Inventaris\bin"

:: 2. Salin file peluncur utama dan petunjuk
copy "%~dp0Mulai-Aplikasi.vbs" "%~dp0Dist-Inventaris\"
copy "%~dp0Matikan-Aplikasi.bat" "%~dp0Dist-Inventaris\"
copy "%~dp0PETUNJUK-BACA-SAYA.txt" "%~dp0Dist-Inventaris\"

:: 3. Salin node.exe portabel
copy "%~dp0bin\node.exe" "%~dp0Dist-Inventaris\bin\"

:: 4. Salin folder backend
echo Menyalin backend... (Mohon tunggu sebentar)
xcopy "%~dp0backend" "%~dp0Dist-Inventaris\backend" /E /H /Y /I >nul

:: 5. Bersihkan data database lokal / uploads / exports sementara dari folder hasil salinan agar bersih
if exist "%~dp0Dist-Inventaris\backend\database" rd /s /q "%~dp0Dist-Inventaris\backend\database"
if exist "%~dp0Dist-Inventaris\backend\uploads" rd /s /q "%~dp0Dist-Inventaris\backend\uploads"
if exist "%~dp0Dist-Inventaris\backend\exports" rd /s /q "%~dp0Dist-Inventaris\backend\exports"

echo.
echo =============================================================
echo BERHASIL! Folder "Dist-Inventaris" telah berhasil dibuat.
echo =============================================================

:: Jika dipanggil dengan argumen "nopause", jangan pause (dipanggil dari Buat-Installer.bat)
if /i "%~1"=="nopause" exit /b 0
pause

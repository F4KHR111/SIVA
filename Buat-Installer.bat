@echo off
title Membuat Installer Sistem Inventaris Gedung Agung
echo =============================================================
echo             MEMBUAT INSTALLER INVENTARIS
echo =============================================================
echo.

:: 1. Jalankan Bungkus-Aplikasi.bat untuk mempersiapkan file
echo Mempersiapkan folder distribusi (Dist-Inventaris)...
call "%~dp0Bungkus-Aplikasi.bat" nopause
echo.

:: 2. Cari compiler Inno Setup (iscc.exe)
set "ISCC_PATH="
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set "ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    set "ISCC_PATH=C:\Program Files\Inno Setup 6\ISCC.exe"
) else if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" (
    set "ISCC_PATH=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
) else (
    echo ERROR: Compiler Inno Setup tidak ditemukan.
    echo Harap instal Inno Setup terlebih dahulu.
    pause
    exit /b 1
)

echo Mengompilasi installer tunggal...
"%ISCC_PATH%" "%~dp0setup.iss"

if %ERRORLEVEL% equ 0 (
    echo.
    echo =============================================================
    echo SUKSES! Installer tunggal berhasil dibuat.
    echo.
    echo Lokasi file: %~dp0Setup-Inventaris.exe
    echo.
    echo Silakan kirim file "Setup-Inventaris.exe" ini langsung ke teman Anda.
    echo =============================================================
) else (
    echo.
    echo =============================================================
    echo ERROR: Gagal mengompilasi installer.
    echo Pastikan Inno Setup sudah terinstal dengan benar.
    echo =============================================================
)
echo.
pause

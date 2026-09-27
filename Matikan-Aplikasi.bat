@echo off
title Hentikan Sistem Inventaris
echo Menghentikan Sistem Inventaris Gedung Agung...
taskkill /f /im node.exe
echo.
echo Aplikasi berhasil dihentikan secara aman!
timeout /t 2 >nul

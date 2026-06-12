@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === add-slugs (questions.json に slug を付与) ===
node scripts\add-slugs.mjs
echo.
pause

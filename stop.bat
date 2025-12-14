@echo off
chcp 65001 >nul
echo ========================================
echo  Prom Report App 종료
echo ========================================
echo.

echo [1/2] 백엔드 서버 종료 중...
taskkill /FI "WindowTitle eq Prom Backend Server*" /T /F >nul 2>&1
if %errorlevel% equ 0 (
    echo  ✓ 백엔드 서버 종료 완료
) else (
    echo  - 실행 중인 백엔드 서버가 없습니다.
)

echo [2/2] 프론트엔드 서버 종료 중...
taskkill /FI "WindowTitle eq Prom Frontend Server*" /T /F >nul 2>&1
if %errorlevel% equ 0 (
    echo  ✓ 프론트엔드 서버 종료 완료
) else (
    echo  - 실행 중인 프론트엔드 서버가 없습니다.
)

echo.
echo ========================================
echo  종료 완료!
echo ========================================
echo.

pause

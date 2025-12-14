@echo off
chcp 65001 >nul
echo ========================================
echo  Prom Report App 시작
echo ========================================
echo.

REM 백엔드 디렉토리 확인
if not exist "%~dp0backend" (
    echo [ERROR] backend 폴더를 찾을 수 없습니다.
    pause
    exit /b 1
)

REM 프론트엔드 디렉토리 확인
if not exist "%~dp0frontend" (
    echo [ERROR] frontend 폴더를 찾을 수 없습니다.
    pause
    exit /b 1
)

echo [1/3] 백엔드 서버 시작 중...
start "Prom Backend Server" cmd /k "cd /d %~dp0backend && apache-maven-3.9.6\bin\mvn spring-boot:run"

echo [2/3] 잠시 대기 중 (5초)...
timeout /t 5 /nobreak >nul

echo [3/3] 프론트엔드 서버 시작 중...
start "Prom Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo  실행 완료!
echo ========================================
echo.
echo  백엔드:  http://localhost:8080
echo  프론트엔드: http://localhost:5173
echo.
echo  각 서버는 별도 창에서 실행됩니다.
echo  종료하려면 각 창을 닫으세요.
echo ========================================
echo.

pause

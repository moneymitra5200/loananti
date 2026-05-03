@echo off
echo ========================================
echo   LOAN APP - DEPLOY TO LIVE SERVER
echo ========================================
echo.

echo [1/2] Committing and pushing to GitHub...
cd C:\Users\bscom\Desktop\reallll
git add -A
git commit -m "deploy: %date% %time%"
git push loananti main
if %errorlevel% neq 0 (
    echo PUSH FAILED! Check your GitHub connection.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DONE! Hostinger is now auto-building
echo   and deploying your site.
echo.
echo   Check build progress at:
echo   hpanel.hostinger.com > Deployments
echo.
echo   Site will be LIVE in ~2-3 minutes at:
echo   https://moneymitrafinancialadvisor.com
echo ========================================
pause

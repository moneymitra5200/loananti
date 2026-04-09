@echo off
echo ========================================
echo   LOAN APP - DEPLOY TO LIVE SERVER
echo ========================================
echo.

echo [1/4] Building app...
cd C:\Users\bscom\Desktop\reallll
call npm run build
if %errorlevel% neq 0 (
    echo BUILD FAILED! Fix errors and try again.
    pause
    exit /b 1
)

echo [2/4] Committing to GitHub...
git add -A
git commit -m "auto-deploy: %date% %time%"
git push loananti main

echo [3/4] Updating live server...
ssh -p 65002 u366636586@153.92.6.50 "export NVM_DIR=$HOME/.nvm && \. $NVM_DIR/nvm.sh && cd ~/public_html/loanapp && git pull origin main && pkill -f 'node server.js'; sleep 2; nohup node server.js > server.log 2>&1 &"

echo.
echo ========================================
echo   DONE! Site is LIVE at:
echo   https://moneymitraadvisor.com
echo ========================================
pause

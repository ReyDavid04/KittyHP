@echo off
setlocal

cd /d "C:\Users\IMP102595\Projects\KittyHP\backend"
if not exist "C:\Users\IMP102595\Projects\KittyHP\backend\logs" mkdir "C:\Users\IMP102595\Projects\KittyHP\backend\logs"

npm run email-worker >> "C:\Users\IMP102595\Projects\KittyHP\backend\logs\email-worker.log" 2>&1

endlocal

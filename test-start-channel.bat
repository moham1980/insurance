@echo off
title FE: channel-workspace-ui
cd /d "D:\CascadeProjects\old\insurance\services\channel-workspace-ui"
node "D:\CascadeProjects\old\insurance\node_modules\next\dist\bin\next" dev -p 4031
echo.
echo [SERVICE STOPPED] FE: channel-workspace-ui
pause

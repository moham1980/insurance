@echo off
title FE: agent-portal-ui
cd /d "D:\CascadeProjects\old\insurance\services\agent-portal-ui"
node "D:\CascadeProjects\old\insurance\node_modules\next\dist\bin\next" dev -p 4001
echo.
echo [SERVICE STOPPED] FE: agent-portal-ui
pause

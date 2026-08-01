@echo off
title FE: broker-portal-ui
cd /d "d:\CascadeProjects\old\insurance\services\broker-portal-ui"
node "d:\CascadeProjects\old\insurance\node_modules\next\dist\bin\next" dev -p 4030
echo.
echo [SERVICE STOPPED] FE: broker-portal-ui
pause

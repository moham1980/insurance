@echo off
title FE: customer-portal-ui
cd /d "D:\CascadeProjects\old\insurance\services\customer-portal-ui"
node "D:\CascadeProjects\old\insurance\node_modules\next\dist\bin\next" dev -p 4002
echo.
echo [SERVICE STOPPED] FE: customer-portal-ui
pause

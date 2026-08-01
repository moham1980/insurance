$services = @('broker-portal-ui','agent-portal-ui','channel-workspace-ui','customer-portal-ui','web-ui')
foreach ($svc in $services) {
    $nmPath = "d:\CascadeProjects\old\insurance\services\$svc\node_modules"
    $pkgPath = "d:\CascadeProjects\old\insurance\services\$svc\package.json"
    Write-Host "$svc : node_modules=$(Test-Path $nmPath)  package.json=$(Test-Path $pkgPath)"
}

$ports = @(4030, 4001, 4031, 4002, 4026, 3030, 3020, 3001, 3040, 3035)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        $procName = if ($proc) { $proc.ProcessName } else { "unknown" }
        Write-Host "Port $port : LISTENING (PID $($conn.OwningProcess), $procName)"
    } else {
        Write-Host "Port $port : NOT LISTENING"
    }
}

$dirs = @('customer-portal-ui','channel-workspace-ui','agent-portal-ui','web-ui','broker-portal-ui','admin-ui')
$results = @()
foreach ($dir in $dirs) {
    $base = Join-Path 'd:\CascadeProjects\old\insurance\services' $dir
    if (Test-Path $base) {
        $files = Get-ChildItem -Path $base -Recurse -Filter '*.tsx' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules' -and $_.Name -match '^(page|index)\.tsx$' }
        foreach ($f in $files) {
            $lines = (Get-Content $f.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
            $rel = $f.FullName.Replace($base + '\', '')
            $results += [PSCustomObject]@{ Lines=$lines; App=$dir; File=$rel }
        }
    }
}
$results | Sort-Object Lines | Format-Table -AutoSize

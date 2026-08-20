# Quick oversized-file scan for SAVOR project
$dirs = @("app", "lib", "components", "e2e", "scripts")
foreach ($d in $dirs) {
  Get-ChildItem -Recurse -Include *.ts, *.tsx -Path $d -ErrorAction SilentlyContinue | ForEach-Object {
    $count = (Get-Content $_.FullName -ErrorAction SilentlyContinue).Count
    if ($count -gt 400) {
      Write-Output ("{0} : {1} lines" -f $_.FullName, $count)
    }
  }
}
Write-Output "SCAN COMPLETE"
$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path "build" | Out-Null

gcc -Wall -Wextra -std=c11 -O2 src\main.c src\geo.c -o build\navcalc.exe
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

gcc -Wall -Wextra -std=c11 -O2 -shared src\geo.c -o build\navcalc.dll
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Built build\navcalc.exe"
Write-Host "Built build\navcalc.dll"

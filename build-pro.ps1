param([switch]$NoTest, [switch]$Launch)
# GioReader Pro — tek dosya derleme + dağıtım + otomatik self-test
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$enc = New-Object System.Text.UTF8Encoding($false)
$build = (Get-Date).ToString('yyyyMMddHHmm')

$headPart = [IO.File]::ReadAllText("$root\src\shell-head.html", [Text.Encoding]::UTF8)
$headPart = $headPart -replace '<title>GioReader</title>', '<title>GioReader Pro</title>' -replace 'gio-build', 'gio-pro-build' -replace '20261\d{7}', $build -replace 'initial-scale=1,viewport-fit=cover', 'initial-scale=1,maximum-scale=5,user-scalable=yes,viewport-fit=cover'
$shellPart = [IO.File]::ReadAllText("$root\src\shell-body.html", [Text.Encoding]::UTF8)
$css = [IO.File]::ReadAllText("$root\src\base-style.css", [Text.Encoding]::UTF8)
$css2 = ''
if (Test-Path "$root\src\studio.css") { $css2 = [IO.File]::ReadAllText("$root\src\studio.css", [Text.Encoding]::UTF8) }
$vendor = [IO.File]::ReadAllText("$root\src\vendor-inline.html", [Text.Encoding]::UTF8)
$baseApp = [IO.File]::ReadAllText("$root\src\base-app.js", [Text.Encoding]::UTF8)
$proExt = [IO.File]::ReadAllText("$root\src\pro-extensions.js", [Text.Encoding]::UTF8)
$studio = ''
if (Test-Path "$root\src\studio.js") { $studio = [IO.File]::ReadAllText("$root\src\studio.js", [Text.Encoding]::UTF8) }

$marker = 'onSyncChange=function(){};'
$idx = $baseApp.LastIndexOf($marker)
if ($idx -lt 0) { throw "Marker not found in base-app.js" }
$combinedJs = $baseApp.Substring(0, $idx) + "`n" + $proExt + "`n" + $studio + "`n" + $baseApp.Substring($idx)

# Sözdizimi denetimi (node varsa)
$exe = Join-Path $env:LOCALAPPDATA 'GioReaderPro\GioReaderPro.exe'
$destApp = Join-Path $env:LOCALAPPDATA 'GioReaderPro\resources\app'
$tmpJs = Join-Path $env:TEMP 'gio-pro-check.js'
[IO.File]::WriteAllText($tmpJs, $combinedJs, $enc)
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $exe
$safePath = $tmpJs.Replace('\', '/')
$psi.Arguments = "-e ""try { new Function(require('fs').readFileSync('$safePath','utf8')); console.log('[OK] JS syntax'); } catch(e){ console.error(e.message); process.exit(1); }"""
$psi.EnvironmentVariables['ELECTRON_RUN_AS_NODE'] = '1'
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$p = [System.Diagnostics.Process]::Start($psi)
$out = $p.StandardOutput.ReadToEnd()
$err = $p.StandardError.ReadToEnd()
$p.WaitForExit()
if ($p.ExitCode -ne 0) {
  Write-Output "ERR: $err"
  throw "JS syntax check failed"
}
Write-Output $out.Trim()

$fullHtml = $headPart + "`n<style id=`"app-style`">`n" + $css + "`n" + $css2 + "`n</style>`n" + $shellPart + "`n<script src=`"pdf.min.js`"></script>`n" + $vendor + "`n<script id=`"app-main`">`n" + $combinedJs + "`n</script></body></html>"
[IO.File]::WriteAllText("$root\www\index.html", $fullHtml, $enc)
Write-Output ("[OK] www/index.html " + $fullHtml.Length + " chars, build " + $build)

Stop-Process -Name "GioReaderPro" -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 400
foreach ($f in 'main.js', 'preload.js', 'fsapi.js', 'package.json') { Copy-Item "$root\$f" "$destApp\$f" -Force }
Copy-Item "$root\www\index.html" "$destApp\www\index.html" -Force
Write-Output "[OK] deployed"

if (-not $NoTest) {
  $outFile = "$root\self-test-result.json"
  if (Test-Path $outFile) { Remove-Item $outFile -Force }
  $env:GIO_SELF_TEST = '1'
  $env:GIO_SELF_TEST_OUT = $outFile
  $proc = Start-Process -FilePath $exe -PassThru
  if (-not $proc.WaitForExit(120000)) { Stop-Process -Id $proc.Id -Force; Write-Output "SELF-TEST TIMEOUT" }
  Remove-Item Env:\GIO_SELF_TEST -ErrorAction SilentlyContinue
  Remove-Item Env:\GIO_SELF_TEST_OUT -ErrorAction SilentlyContinue
  if (Test-Path $outFile) { Get-Content $outFile -Raw } else { Write-Output "No self-test output" }
}
if ($Launch) { Start-Process $exe }

param([string]$Url="",[string]$Scene,[string]$Lang="fr",[int]$W=1280,[int]$H=720,[double]$Scale=1.5,[string]$Out,[int]$Budget=20000)
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$prof=Join-Path $env:TEMP ("o27shot-"+[guid]::NewGuid().ToString("N"))
$url=if($Url){$Url}else{"http://localhost:8765/tools/capture/cap.html?s=$Scene&lang=$Lang"}
$args=@("--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--user-data-dir=$prof","--window-size=$W,$H","--force-device-scale-factor=$Scale","--virtual-time-budget=$Budget","--screenshot=$Out",$url)
$p=Start-Process -FilePath $edge -ArgumentList $args -PassThru -WindowStyle Hidden
if(-not $p.WaitForExit(90000)){ $p.Kill(); "timeout $Scene" }
Start-Sleep -Milliseconds 300
Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue
if(Test-Path $Out){ "ok $Out $((Get-Item $Out).Length)" } else { "missing $Out" }

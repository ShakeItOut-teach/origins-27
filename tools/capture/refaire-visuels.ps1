# Refaire tous les visuels d'Origins 27 à partir du jeu actuel (Windows, avec Microsoft Edge).
#   powershell -ExecutionPolicy Bypass -File tools\capture\refaire-visuels.ps1
# Produit : presentation/paysage-1920x1080, presentation/mobile-1080x1920 (diapositives légendées),
#           itch/screenshots-en, itch/cover-630x500.png, apercu.jpg (aperçu des liens partagés).
# Une partie de démonstration (jour 9) est construite par tools/capture/cap.html, puis Edge la photographie sans fenêtre.
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $here "..\..")).Path
$shots = Join-Path $here "shots"
$server = Start-Process powershell -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",(Join-Path $here "serve.ps1"),"-Root",$root) -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
try {
  $shoot = Join-Path $here "shoot.ps1"
  $fr = @(@("title","00-accueil"),@("cell","01-cellule"),@("map","02-carte"),@("raid","03-pillage"),@("army","04-armee"),@("species","05-espece"),@("gazette","06-gazette"),@("evo","07-evolution"),@("crisis","08-crise"))
  $en = @(@("title","00-home"),@("cell","01-cell"),@("map","02-map"),@("raid","03-raid"),@("army","04-army"),@("species","05-species"),@("gazette","06-gazette"),@("evo","07-evolution"),@("crisis","08-crisis"))
  New-Item -ItemType Directory -Force "$shots\paysage","$shots\mobile","$shots\en" | Out-Null
  foreach ($s in $fr) { & $shoot -Scene $s[0] -Lang fr -W 1280 -H 720 -Scale 1.5 -Out "$shots\paysage\$($s[1]).png" }
  foreach ($s in $fr) { & $shoot -Scene $s[0] -Lang fr -W 540 -H 960 -Scale 2 -Out "$shots\mobile\$($s[1]).png" }
  foreach ($s in $en) { & $shoot -Scene $s[0] -Lang en -W 1280 -H 720 -Scale 1.5 -Out "$shots\en\$($s[1]).png" }
  & $shoot -Scene og -Lang fr -W 1200 -H 630 -Scale 1 -Out "$shots\apercu.png"
  & $shoot -Scene cover -Lang en -W 630 -H 500 -Scale 1 -Out "$shots\cover-630x500.png"
  # diapositives légendées
  foreach ($f in "paysage","mobile") {
    $dir = if ($f -eq "paysage") { "$root\presentation\paysage-1920x1080" } else { "$root\presentation\mobile-1080x1920" }
    Remove-Item "$dir\*.png" -ErrorAction SilentlyContinue
    for ($i = 0; $i -lt $fr.Count; $i++) {
      $w = if ($f -eq "paysage") { 1920 } else { 1080 }; $h = if ($f -eq "paysage") { 1080 } else { 1920 }
      & $shoot -Url "http://localhost:8765/tools/capture/slide.html?i=$i&f=$f" -W $w -H $h -Scale 1 -Budget 8000 -Out "$dir\$($fr[$i][1]).png"
    }
  }
  # itch.io et aperçu
  Remove-Item "$root\itch\screenshots-en\*.png" -ErrorAction SilentlyContinue
  Copy-Item "$shots\en\*.png" "$root\itch\screenshots-en\" -Force
  Copy-Item "$shots\cover-630x500.png" "$root\itch\cover-630x500.png" -Force
  Add-Type -AssemblyName System.Drawing
  $img = [System.Drawing.Image]::FromFile("$shots\apercu.png")
  $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 90L
  $img.Save("$root\apercu.jpg", $enc, $ep); $img.Dispose()
  "Visuels refaits."
} finally { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }

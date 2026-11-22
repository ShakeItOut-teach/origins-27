# Fabrique le paquet à déposer sur itch.io : un zip avec index.html à la racine, css/ et js/.
# Usage, depuis le dossier du dépôt :  powershell -ExecutionPolicy Bypass -File tools\itch-zip.ps1
# Résultat : dist\origins27-itch.zip (le dossier dist n'est pas envoyé sur GitHub, voir .gitignore).
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $repo "dist"
$tmp = Join-Path $dist "itch"
$zip = Join-Path $dist "origins27-itch.zip"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
Copy-Item (Join-Path $repo "index.html") $tmp
Copy-Item (Join-Path $repo "apercu.jpg") $tmp
Copy-Item (Join-Path $repo "css") $tmp -Recurse
Copy-Item (Join-Path $repo "js") $tmp -Recurse
if (Test-Path $zip) { Remove-Item $zip -Force }
# Compress-Archive écrit des chemins avec « \ » que certains serveurs lisent mal : on passe par .NET avec des « / »
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::Open($zip, "Create")
try {
  Get-ChildItem $tmp -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($tmp.Length + 1).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, $_.FullName, $rel, "Optimal") | Out-Null
  }
} finally { $z.Dispose() }
Remove-Item $tmp -Recurse -Force
$n = (Get-Item $zip).Length
"Paquet itch.io prêt : $zip ($([math]::Round($n/1KB)) Ko)"

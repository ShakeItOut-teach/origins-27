# Petit serveur local (lecture seule) pour les captures : sert le dossier du dépôt sur http://localhost:8765/
param([string]$Root, [int]$Port = 8765)
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.json'='application/json'; '.png'='image/png'; '.jpg'='image/jpeg'; '.svg'='image/svg+xml'; '.css'='text/css'; '.webmanifest'='application/manifest+json' }
while ($l.IsListening) {
  $c = $l.GetContext()
  try {
    $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/'))
    if ($p -eq '') { $p = 'index.html' }
    $f = [System.IO.Path]::GetFullPath((Join-Path $Root $p))
    if ($f.StartsWith([System.IO.Path]::GetFullPath($Root)) -and (Test-Path $f -PathType Leaf)) {
      $b = [System.IO.File]::ReadAllBytes($f); $ext = [System.IO.Path]::GetExtension($f).ToLower()
      $c.Response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
      $c.Response.Headers.Add('Cache-Control', 'no-store'); $c.Response.OutputStream.Write($b, 0, $b.Length)
    } else { $c.Response.StatusCode = 404 }
  } catch { $c.Response.StatusCode = 500 }
  $c.Response.Close()
}

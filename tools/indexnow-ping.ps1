# Ping IndexNow for URLs from sitemap.xml (Yandex + Bing + api.indexnow.org).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\indexnow-ping.ps1
# Optional: -Urls https://petr-alekseev.ru/ https://petr-alekseev.ru/blog/

param(
  [string[]]$Urls = @()
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$key = "15cc1411bc624812835571494ad154e0"
$keyLocation = "https://petr-alekseev.ru/$key.txt"

if ($Urls.Count -eq 0) {
  $sitemap = Get-Content -Raw -Encoding UTF8 (Join-Path $root "sitemap.xml")
  $Urls = [regex]::Matches($sitemap, "<loc>\s*([^<]+?)\s*</loc>") | ForEach-Object { $_.Groups[1].Value.Trim() }
  $Urls = $Urls | Where-Object { $_ -notmatch 'privacy\.html$|consent\.html$' }
}

$payload = @{
  host        = "petr-alekseev.ru"
  key         = $key
  keyLocation = $keyLocation
  urlList     = @($Urls)
} | ConvertTo-Json -Depth 5 -Compress

$endpoints = @(
  "https://yandex.com/indexnow",
  "https://www.bing.com/indexnow",
  "https://api.indexnow.org/indexnow"
)

Write-Host "IndexNow URLs: $($Urls.Count)"
foreach ($ep in $endpoints) {
  try {
    $resp = Invoke-WebRequest -Uri $ep -Method POST -Body $payload -ContentType "application/json; charset=utf-8" -UseBasicParsing
    Write-Host "$ep -> $($resp.StatusCode)"
    if ($resp.Content) { Write-Host $resp.Content.Substring(0, [Math]::Min(300, $resp.Content.Length)) }
  } catch {
    $r = $_.Exception.Response
    if ($r) {
      Write-Host "$ep -> $([int]$r.StatusCode) $($_.Exception.Message)"
    } else {
      Write-Host "$ep -> ERR $($_.Exception.Message)"
    }
  }
}

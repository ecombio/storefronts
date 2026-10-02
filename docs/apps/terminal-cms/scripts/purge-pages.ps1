param([switch]$Apply, [string[]]$Keep = @())
$ErrorActionPreference = 'Stop'
$shop = 'ecombio.myshopify.com'
$url = "https://$shop/admin/api/2025-01/graphql.json"

$cfg = @{}
Get-Content .env.local | ForEach-Object { if ($_ -match '^\s*([^#=]+?)\s*=\s*"?(.*?)"?\s*$') { $cfg[$matches[1]] = $matches[2] } }
$tok = Invoke-RestMethod -Method Post -Uri "https://$shop/admin/oauth/access_token" -ContentType 'application/x-www-form-urlencoded' -Body @{ grant_type = 'client_credentials'; client_id = $cfg['SHOPIFY_ADMIN_CLIENT_ID']; client_secret = $cfg['SHOPIFY_ADMIN_CLIENT_SECRET'] }
$headers = @{ 'X-Shopify-Access-Token' = $tok.access_token; 'Content-Type' = 'application/json' }

function Gql([string]$q, $vars = @{}) {
  $r = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body (@{ query = $q; variables = $vars } | ConvertTo-Json -Depth 12)
  if ($r.errors) { throw ('GraphQL error: ' + ($r.errors | ConvertTo-Json -Compress)) }
  return $r
}
function Get-AllPages {
  $all = @(); $after = $null
  do {
    $q = 'query($after:String){ pages(first:100, after:$after){ pageInfo{hasNextPage endCursor} nodes{ id title handle isPublished templateSuffix body } } }'
    $r = Gql $q @{ after = $after }
    $all += $r.data.pages.nodes
    $after = $r.data.pages.pageInfo.endCursor
  } while ($r.data.pages.pageInfo.hasNextPage)
  return $all
}

$snapDir = 'docs\storefronts\blog\seo\snapshots'
if (-not (Test-Path $snapDir)) { New-Item -ItemType Directory -Path $snapDir -Force | Out-Null }
$pages = Get-AllPages
$snap = Join-Path $snapDir ("pages-before-purge-{0}.json" -f (Get-Date -Format yyyyMMdd-HHmmss))
$pages | ConvertTo-Json -Depth 6 | Set-Content $snap
Write-Host ("{0} pages found. Snapshot: {1}" -f $pages.Count, $snap)

$targets = @($pages | Where-Object { $Keep -notcontains $_.handle })
Write-Host ("Would delete {0}, keeping {1}: {2}" -f $targets.Count, ($pages.Count - $targets.Count), ($Keep -join ', '))
Write-Host ''
Write-Host 'Code that references pages (check these before applying):'
git grep -n -i -E '/pages/|getPage|pageByHandle|pages\(' -- app components lib 2>$null | Select-Object -First 40
Write-Host ''
$targets | ForEach-Object { Write-Host ('  /pages/' + $_.handle) }

if ($Apply) {
  $m = 'mutation($id:ID!){ pageDelete(id:$id){ deletedPageId userErrors{ field message } } }'
  $failed = 0
  foreach ($p in $targets) {
    $res = Gql $m @{ id = $p.id }
    if ($res.data.pageDelete.userErrors) { $failed++; Write-Host ('FAILED ' + $p.handle + ': ' + ($res.data.pageDelete.userErrors | ConvertTo-Json -Compress)) -ForegroundColor Red }
  }
  $left = Get-AllPages
  Write-Host ''
  Write-Host ("Deleted {0}, failed {1}. Pages remaining in Shopify: {2}" -f ($targets.Count - $failed), $failed, $left.Count)
  $left | ForEach-Object { Write-Host ('  /pages/' + $_.handle) }
} else { Write-Host ''; Write-Host 'Preview only. Rerun with -Apply to delete.' -ForegroundColor Cyan }

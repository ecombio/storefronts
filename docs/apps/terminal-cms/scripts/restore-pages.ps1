param([switch]$Apply, [string]$Match = '^(after-items?-|technical-specifications-|frequently-asked-questions-)')
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

$snapFile = 'docs\storefronts\blog\seo\snapshots\pages-before-purge-20261002-140305.json'
$old = @(Get-Content $snapFile -Raw | ConvertFrom-Json)
$now = @((Gql 'query{ pages(first:100){ nodes{ handle } } }').data.pages.nodes | ForEach-Object { $_.handle })
$todo = @($old | Where-Object { ($now -notcontains $_.handle) -and ($_.handle -match $Match) })
Write-Host ('Snapshot has {0} pages, {1} exist now, {2} match and would be restored:' -f $old.Count, $now.Count, $todo.Count)
$todo | ForEach-Object { Write-Host ('  /pages/' + $_.handle) }

if ($Apply) {
  $m = 'mutation($p:PageCreateInput!){ pageCreate(page:$p){ page{ id handle } userErrors{ field message } } }'
  $failed = 0
  $map = @()
  foreach ($p in $todo) {
    $in = @{ title = $p.title; handle = $p.handle; body = [string]$p.body; isPublished = [bool]$p.isPublished }
    if ($p.templateSuffix) { $in.templateSuffix = $p.templateSuffix }
    $res = Gql $m @{ p = $in }
    if ($res.data.pageCreate.userErrors) { $failed++; Write-Host ('FAILED ' + $p.handle + ': ' + ($res.data.pageCreate.userErrors | ConvertTo-Json -Compress)) -ForegroundColor Red }
    else { $map += [pscustomobject]@{ handle = $p.handle; newId = $res.data.pageCreate.page.id } }
  }
  $mapFile = 'docs\storefronts\blog\seo\snapshots\restored-page-ids.json'
  $map | ConvertTo-Json | Set-Content $mapFile
  Write-Host ''
  Write-Host ('Restored {0}, failed {1}. New IDs saved: {2}' -f ($todo.Count - $failed), $failed, $mapFile)

  Write-Host ''
  Write-Host 'Do products still point at an FAQ page? (read-only check)'
  $pq = 'query($h:String!){ productByIdentifier(identifier:{handle:$h}){ handle metafield(namespace:"custom", key:"frequently_asked_questions"){ value } } }'
  foreach ($p in ($map | Where-Object { $_.handle -like 'frequently-asked-questions-*' })) {
    $ph = $p.handle.Substring('frequently-asked-questions-'.Length)
    $r = Gql $pq @{ h = $ph }
    $prod = $r.data.productByIdentifier
    if (-not $prod) { Write-Host ('  {0}: no product with that handle' -f $ph) }
    elseif ($prod.metafield -and $prod.metafield.value) { Write-Host ('  {0}: metafield set -> {1}' -f $ph, $prod.metafield.value) }
    else { Write-Host ('  {0}: metafield EMPTY (needs relinking)' -f $ph) -ForegroundColor Yellow }
  }
} else { Write-Host ''; Write-Host 'Preview only. Rerun with -Apply to restore.' -ForegroundColor Cyan }

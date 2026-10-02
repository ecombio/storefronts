param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$shop = 'ecombio.myshopify.com'
$menuId = 'gid://shopify/Menu/227397599446'
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
$map = [ordered]@{
  'Press' = 'press'; 'Our impact' = 'our-impact'; "We're hiring!" = 'careers'; 'Demo' = 'demo'
  'Refer a friend' = 'refer-a-friend'; '1-year warranty' = 'warranty'; 'Protection plan' = 'protection-plan'
  'Trade-in' = 'trade-in'; 'Campus+ Student and Educator Offer' = 'campus-plus'; 'Military program' = 'military-program'
  'Sellers: Register to sell' = 'sell-with-us'; 'Seller portal' = 'seller-portal'; 'Back Market for Business' = 'business'
  'Payments 100% secured' = 'secure-payments'; 'Trade-in Terms and Conditions' = 'trade-in-terms'
  'Cookies' = 'cookies'; 'Report illicit content' = 'report-illicit-content'
}
$existing = @((Gql 'query{ pages(first:100){ nodes{ handle } } }').data.pages.nodes | ForEach-Object { $_.handle })
$m = 'mutation($p:PageCreateInput!){ pageCreate(page:$p){ page{ id } userErrors{ field message } } }'
$ok = @($existing)
foreach ($t in $map.Keys) {
  $h = $map[$t]
  if ($existing -contains $h) { Write-Host "  /pages/$h exists, skipping"; continue }
  Write-Host "  /pages/$h will be created ($t)"
  if ($Apply) {
    $body = '<h2>' + [System.Net.WebUtility]::HtmlEncode($t) + '</h2><p>The details for this page are being finalized. For questions, visit our <a href="/pages/contact">contact page</a>.</p>'
    $res = Gql $m @{ p = @{ title = $t; handle = $h; body = $body; isPublished = $true } }
    if ($res.data.pageCreate.userErrors) { Write-Host ('    FAILED: ' + ($res.data.pageCreate.userErrors | ConvertTo-Json -Compress)) -ForegroundColor Red; continue }
  }
  $ok += $h
}
$mq = 'query($id:ID!){ menu(id:$id){ id title handle items{ title url type items{ title url type } } } }'
$cur = Gql $mq @{ id = $menuId }
if ($cur.data.menu.handle -ne 'footer') { throw 'Not the footer menu, stopping.' }
$snap = Join-Path 'docs\storefronts\blog\seo\snapshots' ("menu-footer-{0}.json" -f (Get-Date -Format yyyyMMdd-HHmmss))
$cur | ConvertTo-Json -Depth 12 | Set-Content $snap
Write-Host "Menu snapshot: $snap"
$script:changes = @()
function Item($n, [bool]$top) {
  $u = $n.url
  if (-not $top -and $map.Contains($n.title) -and ($ok -contains $map[$n.title])) {
    $target = '/pages/' + $map[$n.title]
    if ($u -ne $target) { $script:changes += ('{0}:  {1}  ->  {2}' -f $n.title, $u, $target); $u = $target }
  }
  $o = @{ title = $n.title; type = 'HTTP'; url = $u }
  $kids = @($n.items | Where-Object { $_ })
  if ($kids.Count -gt 0) { $o.items = @($kids | ForEach-Object { Item $_ $false }) }
  return $o
}
$items = @($cur.data.menu.items | ForEach-Object { Item $_ $true })
$count = 0; foreach ($c in $items) { $count += 1 + @($c.items).Count }
Write-Host "Items kept: $count (should be 40)"
$script:changes | ForEach-Object { Write-Host "   $_" }
if ($Apply) {
  $um = 'mutation($id:ID!,$title:String!,$items:[MenuItemUpdateInput!]!){ menuUpdate(id:$id, title:$title, items:$items){ menu{ id } userErrors{ field message } } }'
  $res = Gql $um @{ id = $menuId; title = $cur.data.menu.title; items = $items }
  if ($res.data.menuUpdate.userErrors) { throw ('menuUpdate: ' + ($res.data.menuUpdate.userErrors | ConvertTo-Json -Compress)) }
  $after = Gql $mq @{ id = $menuId }
  foreach ($c in $after.data.menu.items) { Write-Host ("{0} ({1} links)" -f $c.title, @($c.items).Count) }
} else { Write-Host 'Preview only. Rerun with -Apply.' -ForegroundColor Cyan }

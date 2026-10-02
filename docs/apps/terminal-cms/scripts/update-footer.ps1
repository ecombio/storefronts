param([switch]$Apply, [string]$TrustpilotUrl = '')
$ErrorActionPreference = 'Stop'
$shop = 'ecombio.myshopify.com'
$base = 'https://ecombio.com'
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
function L([string]$title, [string]$path) {
  $u = if ($path -like 'http*') { $path } else { $base + $path }
  return @{ title = $title; type = 'HTTP'; url = $u }
}
function Col([string]$title, $links) {
  return @{ title = $title; type = 'HTTP'; url = ($base + '/'); items = @($links) }
}

# 1. Snapshot the current menu
$snapDir = 'docs\storefronts\blog\seo\snapshots'
if (-not (Test-Path $snapDir)) { New-Item -ItemType Directory -Path $snapDir | Out-Null }
$mq = 'query($id:ID!){ menu(id:$id){ id title handle items{ title url type items{ title url type } } } }'
$cur = Gql $mq @{ id = $menuId }
if ($cur.data.menu.handle -ne 'footer') { throw 'Menu handle is not footer, stopping.' }
$snap = Join-Path $snapDir ("menu-footer-{0}.json" -f (Get-Date -Format yyyyMMdd-HHmmss))
$cur | ConvertTo-Json -Depth 12 | Set-Content $snap
Write-Host "Snapshot: $snap"

# 2. Check that the pages we link to exist
foreach ($h in @('contact', 'data-sharing-opt-out', 'about')) {
  $r = Gql 'query($q:String!){ pages(first:1, query:$q){ nodes{ id handle isPublished } } }' @{ q = "handle:$h" }
  $n = @($r.data.pages.nodes)
  if ($n.Count -eq 0) { Write-Host ("page /pages/{0}: MISSING" -f $h) -ForegroundColor Yellow }
  else { Write-Host ("page /pages/{0}: exists, published={1}" -f $h, $n[0].isPublished) }
}

# 3. About page
$aboutBody = '<h2>About Ecombio</h2>' +
  '<p>Ecombio, Inc. operates ecombio.com, an online store for electric bikes and electric scooters.</p>' +
  '<h2>Contact us</h2>' +
  '<p>Questions about an order, shipping, or returns? Visit our <a href="/pages/contact">contact page</a>.</p>' +
  '<h2>Policies</h2>' +
  '<p>Read our <a href="/policies/shipping-policy">shipping policy</a>, <a href="/policies/refund-policy">refund policy</a>, <a href="/policies/privacy-policy">privacy policy</a>, and <a href="/policies/terms-of-service">terms of service</a>.</p>'
$existing = @((Gql 'query{ pages(first:1, query:"handle:about"){ nodes{ id } } }').data.pages.nodes)
if ($existing.Count -eq 0) {
  Write-Host 'About page: would create /pages/about (published)'
  if ($Apply) {
    $m = 'mutation($p:PageCreateInput!){ pageCreate(page:$p){ page{ id handle } userErrors{ field message } } }'
    $res = Gql $m @{ p = @{ title = 'About'; handle = 'about'; body = $aboutBody; isPublished = $true } }
    if ($res.data.pageCreate.userErrors) { throw ('pageCreate: ' + ($res.data.pageCreate.userErrors | ConvertTo-Json -Compress)) }
    Write-Host 'About page created.'
  }
} else { Write-Host 'About page already exists, leaving it alone.' }

# 4. New menu structure
$company = @((L 'About' '/pages/about'), (L 'Blog' '/blogs/articles'))
if ($TrustpilotUrl) { $company += (L 'Trustpilot' $TrustpilotUrl) }
$items = @(
  (Col 'Shop' @((L 'Electric bikes' '/collections/electric-bikes'), (L 'All products' '/collections/all'), (L 'Buying guides' '/blogs/tag/electric-scooter-buying-guide'))),
  (Col 'Support' @((L 'Contact us' '/pages/contact'), (L 'Shipping' '/policies/shipping-policy'), (L 'Returns and refunds' '/policies/refund-policy'), (L 'Track an order' '/account/orders'))),
  (Col 'Company' $company),
  (Col 'Legal' @((L 'Privacy Policy' '/policies/privacy-policy'), (L 'Terms of Service' '/policies/terms-of-service'), (L 'Legal Notice' '/policies/legal-notice'), (L 'Contact Information' '/policies/contact-information'), (L 'Refund Policy' '/policies/refund-policy'), (L 'Your Privacy Choices' '/pages/data-sharing-opt-out')))
)
Write-Host "`nNew footer menu:"
foreach ($c in $items) { Write-Host $c.title; foreach ($i in $c.items) { Write-Host ("   {0}  ->  {1}" -f $i.title, $i.url) } }

if ($Apply) {
  $um = 'mutation($id:ID!,$title:String!,$items:[MenuItemUpdateInput!]!){ menuUpdate(id:$id, title:$title, items:$items){ menu{ id handle } userErrors{ field message } } }'
  $res = Gql $um @{ id = $menuId; title = $cur.data.menu.title; items = $items }
  if ($res.data.menuUpdate.userErrors) { throw ('menuUpdate: ' + ($res.data.menuUpdate.userErrors | ConvertTo-Json -Compress)) }
  $after = Gql $mq @{ id = $menuId }
  Write-Host "`nVerified from Shopify:"
  foreach ($c in $after.data.menu.items) { Write-Host ("{0} ({1} links)" -f $c.title, @($c.items).Count) }
} else { Write-Host "`nPreview only. Rerun with -Apply to write." -ForegroundColor Cyan }

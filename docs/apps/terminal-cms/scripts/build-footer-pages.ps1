param([switch]$Apply, [string]$SupportEmail = '', [string]$Hours = '', [string]$TrustpilotUrl = '')
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

$mail = ''
if ($SupportEmail) { $mail = '<a href="mailto:' + $SupportEmail + '">' + $SupportEmail + '</a>' }
$hoursHtml = ''
if ($Hours) { $hoursHtml = '<p>Support hours: ' + $Hours + '</p>' }

$linkList = '<ul>' +
  '<li><a href="/pages/track-an-order">Track an order</a></li>' +
  '<li><a href="/policies/shipping-policy">Shipping policy</a></li>' +
  '<li><a href="/policies/refund-policy">Refund policy</a></li>' +
  '<li><a href="/policies/privacy-policy">Privacy policy</a></li>' +
  '<li><a href="/policies/terms-of-service">Terms of service</a></li>' +
  '<li><a href="/policies/contact-information">Contact information</a></li>' +
  '</ul>'

$specs = @(
  @{ handle = 'help-center'; title = 'Help Center'; needsEmail = $false
     body = '<h2>Help Center</h2><p>Find answers about orders, shipping, returns and your account.</p>' + $linkList + '<p>Still need help? Visit our <a href="/pages/contact">contact page</a>.</p>' },
  @{ handle = 'track-an-order'; title = 'Track an order'; needsEmail = $false
     body = '<h2>Track an order</h2><p>Sign in to your account to see the status of your orders: <a href="/account/orders">view my orders</a>.</p><p>Once an order ships, tracking details are included in your shipping confirmation email.</p><p>Need a hand? Visit our <a href="/pages/contact">contact page</a>.</p>' },
  @{ handle = 'contact'; title = 'Contact us'; needsEmail = $true
     body = '<h2>Contact us</h2><p>Questions about an order, shipping, returns or a product? Email us at ' + $mail + '.</p>' + $hoursHtml + '<h2>Helpful links</h2>' + $linkList },
  @{ handle = 'accessibility'; title = 'Accessibility statement'; needsEmail = $true
     body = '<h2>Accessibility statement</h2><p>Ecombio, Inc. wants everyone to be able to use ecombio.com. If you have difficulty using any part of the site, email us at ' + $mail + ' with the page address and a description of the problem, and we will help you find the information or complete your order.</p>' }
)

$menuMap = [ordered]@{
  'Contact us'             = '/pages/contact'
  'Help Center'            = '/pages/help-center'
  'Track an order'         = '/pages/track-an-order'
  'Accessibility statement' = '/pages/accessibility'
  'Shipping'               = '/policies/shipping-policy'
  'Returns and refunds'    = '/policies/refund-policy'
  'Make a return'          = '/policies/refund-policy'
  'Terms of service'       = '/policies/terms-of-service'
  'Privacy Policy'         = '/policies/privacy-policy'
  "Don't sell or share my personal information" = '/pages/data-sharing-opt-out'
}
if ($TrustpilotUrl) { $menuMap['Trustpilot'] = $TrustpilotUrl }

# Existing pages
$existing = @((Gql 'query{ pages(first:100){ nodes{ handle } } }').data.pages.nodes | ForEach-Object { $_.handle })
$willExist = @($existing)

Write-Host 'Pages:'
$m = 'mutation($p:PageCreateInput!){ pageCreate(page:$p){ page{ id handle } userErrors{ field message } } }'
foreach ($s in $specs) {
  if ($existing -contains $s.handle) { Write-Host ("  /pages/{0}: already exists, leaving it alone" -f $s.handle); continue }
  if ($s.needsEmail -and -not $SupportEmail) { Write-Host ("  /pages/{0}: SKIPPED, needs -SupportEmail" -f $s.handle) -ForegroundColor Yellow; continue }
  Write-Host ("  /pages/{0}: will create ({1})" -f $s.handle, $s.title)
  if ($Apply) {
    $res = Gql $m @{ p = @{ title = $s.title; handle = $s.handle; body = $s.body; isPublished = $true } }
    if ($res.data.pageCreate.userErrors) { Write-Host ('    FAILED: ' + ($res.data.pageCreate.userErrors | ConvertTo-Json -Compress)) -ForegroundColor Red; continue }
  }
  $willExist += $s.handle
}

# Menu
$mq = 'query($id:ID!){ menu(id:$id){ id title handle items{ title url type items{ title url type } } } }'
$cur = Gql $mq @{ id = $menuId }
if ($cur.data.menu.handle -ne 'footer') { throw 'Menu handle is not footer, stopping.' }
$snapDir = 'docs\storefronts\blog\seo\snapshots'
$snap = Join-Path $snapDir ("menu-footer-{0}.json" -f (Get-Date -Format yyyyMMdd-HHmmss))
$cur | ConvertTo-Json -Depth 12 | Set-Content $snap
Write-Host "`nMenu snapshot: $snap"

$script:changes = @()
function Item($n, [bool]$top) {
  $u = $n.url
  if (-not $top -and $menuMap.Contains($n.title)) {
    $target = $menuMap[$n.title]
    $ok = $true
    if ($target -like '/pages/*') { $ok = ($willExist -contains $target.Substring(7)) }
    if ($ok -and $u -ne $target) { $script:changes += ('{0}:  {1}  ->  {2}' -f $n.title, $u, $target); $u = $target }
  }
  $o = @{ title = $n.title; type = 'HTTP'; url = $u }
  $kids = @($n.items | Where-Object { $_ })
  if ($kids.Count -gt 0) { $o.items = @($kids | ForEach-Object { Item $_ $false }) }
  return $o
}
$items = @($cur.data.menu.items | ForEach-Object { Item $_ $true })
$count = 0; foreach ($c in $items) { $count += 1 + @($c.items).Count }
Write-Host "Items kept: $count (should be 40)"
Write-Host 'URL changes:'
$script:changes | ForEach-Object { Write-Host "   $_" }

if ($Apply) {
  $um = 'mutation($id:ID!,$title:String!,$items:[MenuItemUpdateInput!]!){ menuUpdate(id:$id, title:$title, items:$items){ menu{ id } userErrors{ field message } } }'
  $res = Gql $um @{ id = $menuId; title = $cur.data.menu.title; items = $items }
  if ($res.data.menuUpdate.userErrors) { throw ('menuUpdate: ' + ($res.data.menuUpdate.userErrors | ConvertTo-Json -Compress)) }
  $after = Gql $mq @{ id = $menuId }
  Write-Host "`nVerified from Shopify:"
  foreach ($c in $after.data.menu.items) { Write-Host ("{0} ({1} links)" -f $c.title, @($c.items).Count) }
} else { Write-Host "`nPreview only. Rerun with -Apply to write." -ForegroundColor Cyan }

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
function Item($n) {
  $o = @{ title = $n.title; type = 'HTTP'; url = $n.url }
  $kids = @($n.items | Where-Object { $_ })
  if ($kids.Count -gt 0) { $o.items = @($kids | ForEach-Object { Item $_ }) }
  return $o
}

$snapFile = Get-ChildItem 'docs\storefronts\blog\seo\snapshots\menu-footer-*.json' | Sort-Object Name | Select-Object -First 1
Write-Host "Restoring from: $($snapFile.Name)"
$old = Get-Content $snapFile.FullName -Raw | ConvertFrom-Json
$topTitles = @($old.data.menu.items | ForEach-Object { $_.title })
if ($topTitles -notcontains 'Services') { throw 'Snapshot does not look like the original menu, stopping.' }
$items = @($old.data.menu.items | ForEach-Object { Item $_ })

foreach ($c in $items) { Write-Host $c.title; foreach ($i in @($c.items)) { Write-Host ("   {0}  ->  {1}" -f $i.title, $i.url) } }

if ($Apply) {
  $um = 'mutation($id:ID!,$title:String!,$items:[MenuItemUpdateInput!]!){ menuUpdate(id:$id, title:$title, items:$items){ menu{ id handle } userErrors{ field message } } }'
  $res = Gql $um @{ id = $menuId; title = $old.data.menu.title; items = $items }
  if ($res.data.menuUpdate.userErrors) { throw ('menuUpdate: ' + ($res.data.menuUpdate.userErrors | ConvertTo-Json -Compress)) }
  $after = Gql 'query($id:ID!){ menu(id:$id){ items{ title items{ title } } } }' @{ id = $menuId }
  Write-Host "`nVerified from Shopify:"
  foreach ($c in $after.data.menu.items) { Write-Host ("{0} ({1} links)" -f $c.title, @($c.items).Count) }
} else { Write-Host "`nPreview only. Rerun with -Apply to write." -ForegroundColor Cyan }


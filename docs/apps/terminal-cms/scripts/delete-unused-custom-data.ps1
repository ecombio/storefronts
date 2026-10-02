param([switch]$Apply)

$env = @{}
Get-Content .env.local | ForEach-Object { if ($_ -match '^\s*([^#=]+?)\s*=\s*"?(.*?)"?\s*$') { $env[$matches[1]] = $matches[2] } }
$resp = Invoke-RestMethod -Method Post -Uri "https://ecombio.myshopify.com/admin/oauth/access_token" -ContentType "application/x-www-form-urlencoded" -Body @{ grant_type = "client_credentials"; client_id = $env["SHOPIFY_ADMIN_CLIENT_ID"]; client_secret = $env["SHOPIFY_ADMIN_CLIENT_SECRET"] }
$headers = @{ "X-Shopify-Access-Token" = $resp.access_token; "Content-Type" = "application/json" }
$url = "https://ecombio.myshopify.com/admin/api/2025-01/graphql.json"

foreach ($s in 'write_products','write_metaobject_definitions') {
  if ($resp.scope -notmatch $s) { throw "Token is missing scope $s. Release the new app version and approve it first." }
}

$snap = '.\docs\storefronts\blog\seo\snapshots'
foreach ($p in 'metafield-definitions-*','metaobject-entries-*','metaobject-definitions-*') {
  $f = Get-ChildItem ($snap + '\' + $p + '.json') -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $f -or $f.Length -lt 1000) { throw "Backup missing or too small for $p. Stop." }
}

function Gql($q, $v) {
  $b = @{ query = $q; variables = $v } | ConvertTo-Json -Depth 6
  Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $b
}

$metafields = @(
  'PRODUCT|feature_grid','PRODUCT|benefits_grid','PRODUCT|featured_highlights','PRODUCT|product_policy',
  'PRODUCT|technical_specification','PRODUCT|frequently_bought_together','PRODUCT|product_bundles',
  'PRODUCT|product_videos','PRODUCT|specifications',
  'COLLECTION|related_posts','COLLECTION|related_products','COLLECTION|promo_banner','COLLECTION|related_articles',
  'COLLECTION|related_post_cards','COLLECTION|articles','COLLECTION|pages','COLLECTION|featured_articles',
  'COLLECTION|sponsored_ads','COLLECTION|product_card_style',
  'PAGE|layout_blocks','PAGE|collections'
)
$metaobjects = @(
  'accordion_block','accordion_item','rich_text_block','product_row_block',
  'feature_item','benefits','featured_highlight','product_video','product_policy',
  'promo_card','promo_carousel','promo_banner','slideshow','layout_variant'
)

$findMf = 'query($o:MetafieldOwnerType!,$k:String!){ metafieldDefinitions(ownerType:$o, namespace:"custom", key:$k, first:1){ nodes{ id name metafieldsCount } } }'
$delMf = 'mutation($id:ID!){ metafieldDefinitionDelete(id:$id, deleteAllAssociatedMetafields:false){ deletedDefinitionId userErrors{ field message code } } }'
$findMo = 'query($t:String!){ metaobjectDefinitionByType(type:$t){ id name metaobjectsCount } }'
$delMo = 'mutation($id:ID!){ metaobjectDefinitionDelete(id:$id){ deletedId userErrors{ field message code } } }'

"== Metafield definitions =="
foreach ($item in $metafields) {
  $owner, $key = $item.Split('|')
  $r = Gql $findMf @{ o = $owner; k = $key }
  if ($r.errors) { Write-Host ("{0} custom.{1}: {2}" -f $owner, $key, ($r.errors | ConvertTo-Json -Compress -Depth 5)) -ForegroundColor Red; continue }
  $d = @($r.data.metafieldDefinitions.nodes)[0]
  if (-not $d) { Write-Host ("{0,-11} custom.{1,-28} not found (already gone)" -f $owner, $key) -ForegroundColor DarkGray; continue }
  if (-not $Apply) { Write-Host ("{0,-11} custom.{1,-28} would delete (values={2})" -f $owner, $key, $d.metafieldsCount); continue }
  $x = Gql $delMf @{ id = $d.id }
  if ($x.errors -or $x.data.metafieldDefinitionDelete.userErrors) { Write-Host ("{0,-11} custom.{1,-28} ERROR {2}" -f $owner, $key, (($x.errors, $x.data.metafieldDefinitionDelete.userErrors) | ConvertTo-Json -Compress -Depth 5)) -ForegroundColor Red }
  else { Write-Host ("{0,-11} custom.{1,-28} deleted" -f $owner, $key) -ForegroundColor Green }
}

"`n== Metaobject definitions =="
foreach ($t in $metaobjects) {
  $r = Gql $findMo @{ t = $t }
  if ($r.errors) { Write-Host ("{0}: {1}" -f $t, ($r.errors | ConvertTo-Json -Compress -Depth 5)) -ForegroundColor Red; continue }
  $d = $r.data.metaobjectDefinitionByType
  if (-not $d) { Write-Host ("{0,-22} not found (already gone)" -f $t) -ForegroundColor DarkGray; continue }
  if (-not $Apply) { Write-Host ("{0,-22} would delete (entries={1})" -f $t, $d.metaobjectsCount); continue }
  $x = Gql $delMo @{ id = $d.id }
  if ($x.errors -or $x.data.metaobjectDefinitionDelete.userErrors) { Write-Host ("{0,-22} ERROR {1}" -f $t, (($x.errors, $x.data.metaobjectDefinitionDelete.userErrors) | ConvertTo-Json -Compress -Depth 5)) -ForegroundColor Red }
  else { Write-Host ("{0,-22} deleted" -f $t) -ForegroundColor Green }
}
if (-not $Apply) { "`nPreview only. Rerun with -Apply to delete." }

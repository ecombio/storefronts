$env = @{}
Get-Content .env.local | ForEach-Object { if ($_ -match '^\s*([^#=]+?)\s*=\s*"?(.*?)"?\s*$') { $env[$matches[1]] = $matches[2] } }
$resp = Invoke-RestMethod -Method Post -Uri "https://ecombio.myshopify.com/admin/oauth/access_token" -ContentType "application/x-www-form-urlencoded" -Body @{ grant_type = "client_credentials"; client_id = $env["SHOPIFY_ADMIN_CLIENT_ID"]; client_secret = $env["SHOPIFY_ADMIN_CLIENT_SECRET"] }
$headers = @{ "X-Shopify-Access-Token" = $resp.access_token; "Content-Type" = "application/json" }
$url = "https://ecombio.myshopify.com/admin/api/2025-01/graphql.json"
$types = 'product_media','product_policy','expert_review','expert_reviews','accordion_item','rich_text_block','product_row_block','accordion_block','promo_card','promo_carousel','nav_link','menu_item','feature_item','product_video','specification','benefits','technical_specification','featured_highlight','slideshow','promo_banner','layout_variant','trust_badge','product_spec','author'
$all = [ordered]@{}
foreach ($t in $types) {
  $q = 'query { metaobjects(type: "' + $t + '", first: 250) { nodes { id handle type fields { key value } } } }'
  $r = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body (@{ query = $q } | ConvertTo-Json)
  if ($r.errors) { Write-Host ($t + ': ' + ($r.errors | ConvertTo-Json -Compress -Depth 5)) -ForegroundColor Yellow; continue }
  $all[$t] = $r.data.metaobjects.nodes
  "{0,-26} entries={1}" -f $t, @($r.data.metaobjects.nodes).Count
}
$out = '.\docs\storefronts\blog\seo\snapshots\metaobject-entries-' + (Get-Date -Format yyyyMMdd-HHmmss) + '.json'
$all | ConvertTo-Json -Depth 10 | Set-Content $out
if (Test-Path $out) { "Saved: $out ({0} bytes)" -f (Get-Item $out).Length } else { Write-Host "BACKUP FAILED" -ForegroundColor Red }

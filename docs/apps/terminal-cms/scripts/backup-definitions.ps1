$env = @{}
Get-Content .env.local | ForEach-Object { if ($_ -match '^\s*([^#=]+?)\s*=\s*"?(.*?)"?\s*$') { $env[$matches[1]] = $matches[2] } }
$resp = Invoke-RestMethod -Method Post -Uri "https://ecombio.myshopify.com/admin/oauth/access_token" -ContentType "application/x-www-form-urlencoded" -Body @{ grant_type = "client_credentials"; client_id = $env["SHOPIFY_ADMIN_CLIENT_ID"]; client_secret = $env["SHOPIFY_ADMIN_CLIENT_SECRET"] }
$headers = @{ "X-Shopify-Access-Token" = $resp.access_token; "Content-Type" = "application/json" }
$url = "https://ecombio.myshopify.com/admin/api/2025-01/graphql.json"
$all = @{}
foreach ($owner in 'PRODUCT','COLLECTION','PAGE','ARTICLE') {
  $q = 'query { metafieldDefinitions(ownerType: ' + $owner + ', first: 250) { nodes { id namespace key name description type { name } validations { name value } access { storefront } pinnedPosition } } }'
  $r = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body (@{ query = $q } | ConvertTo-Json)
  $all[$owner] = $r.data.metafieldDefinitions.nodes
}
$out = '.\docs\storefronts\blog\seo\snapshots\metafield-definitions-' + (Get-Date -Format yyyyMMdd-HHmmss) + '.json'
$all | ConvertTo-Json -Depth 8 | Set-Content $out
"Saved: $out"

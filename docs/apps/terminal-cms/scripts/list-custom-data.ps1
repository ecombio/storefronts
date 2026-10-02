param([string]$Out = '.\docs\storefronts\blog\seo\custom-data.csv')

$env = @{}
Get-Content .env.local | ForEach-Object { if ($_ -match '^\s*([^#=]+?)\s*=\s*"?(.*?)"?\s*$') { $env[$matches[1]] = $matches[2] } }
$resp = Invoke-RestMethod -Method Post -Uri "https://ecombio.myshopify.com/admin/oauth/access_token" -ContentType "application/x-www-form-urlencoded" -Body @{ grant_type = "client_credentials"; client_id = $env["SHOPIFY_ADMIN_CLIENT_ID"]; client_secret = $env["SHOPIFY_ADMIN_CLIENT_SECRET"] }
$headers = @{ "X-Shopify-Access-Token" = $resp.access_token; "Content-Type" = "application/json" }
$url = "https://ecombio.myshopify.com/admin/api/2025-01/graphql.json"

# Metafields the storefront code reads (from the repo search)
$usedInCode = @(
  'custom.after_item_lists','custom.posts','custom.sub_collections',
  'custom.trust_badges','custom.product_specs','custom.expert_reviews','custom.technical_specifications',
  'custom.author_profile'
)

$rows = @()
foreach ($owner in 'PRODUCT','PRODUCTVARIANT','COLLECTION','ARTICLE','BLOG','PAGE','SHOP') {
  $q = 'query { metafieldDefinitions(ownerType: ' + $owner + ', first: 250) { nodes { namespace key name type { name } metafieldsCount access { storefront } } } }'
  $r = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body (@{ query = $q } | ConvertTo-Json)
  if ($r.errors) { Write-Host ("{0}: {1}" -f $owner, ($r.errors | ConvertTo-Json -Compress -Depth 5)) -ForegroundColor Yellow; continue }
  foreach ($n in $r.data.metafieldDefinitions.nodes) {
    $id = $n.namespace + '.' + $n.key
    $rows += [pscustomobject]@{
      Owner = $owner; Metafield = $id; Type = $n.type.name
      Values = $n.metafieldsCount; Storefront = $n.access.storefront
      InCode = ($usedInCode -contains $id)
    }
  }
}

$rows | Sort-Object Owner, Metafield | Format-Table -AutoSize
$rows | Export-Csv $Out -NoTypeInformation

$q2 = 'query { metaobjectDefinitions(first: 250) { nodes { type name metaobjectsCount fieldDefinitions { key } } } }'
$r2 = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body (@{ query = $q2 } | ConvertTo-Json)
if ($r2.errors) { Write-Host ($r2.errors | ConvertTo-Json -Compress -Depth 5) -ForegroundColor Yellow }
else {
  "`nMetaobject definitions"
  $r2.data.metaobjectDefinitions.nodes | Select-Object type, name, metaobjectsCount, @{n='fields';e={($_.fieldDefinitions.key) -join ', '}} | Format-Table -AutoSize
}
"Saved: $Out"

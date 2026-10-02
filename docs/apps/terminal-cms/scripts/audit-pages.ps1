$ErrorActionPreference = 'Stop'
$shop = 'ecombio.myshopify.com'
$site = 'https://ecombio.com'
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
function Has([string]$text, [string]$h) {
  return [regex]::IsMatch($text, '/pages/' + [regex]::Escape($h) + '(?![A-Za-z0-9_-])', 'IgnoreCase')
}

$outDir = 'docs\storefronts\blog\seo'
$snapDir = Join-Path $outDir 'snapshots'
if (-not (Test-Path $snapDir)) { New-Item -ItemType Directory -Path $snapDir -Force | Out-Null }

# 1. All pages (paginated), with a full snapshot
$pages = @(); $after = $null
do {
  $q = 'query($after:String){ pages(first:100, after:$after){ pageInfo{hasNextPage endCursor} nodes{ id title handle isPublished publishedAt templateSuffix createdAt updatedAt body } } }'
  $r = Gql $q @{ after = $after }
  $pages += $r.data.pages.nodes
  $after = $r.data.pages.pageInfo.endCursor
} while ($r.data.pages.pageInfo.hasNextPage)
$snap = Join-Path $snapDir ("pages-{0}.json" -f (Get-Date -Format yyyyMMdd-HHmmss))
$pages | ConvertTo-Json -Depth 6 | Set-Content $snap
Write-Host ("{0} pages. Snapshot: {1}" -f $pages.Count, $snap)

# 2. Current menus and old footer snapshots
$menus = @{}
$mr = Gql 'query{ menus(first:50){ nodes{ handle items{ title url items{ title url items{ title url } } } } } }'
foreach ($m in $mr.data.menus.nodes) { $menus[$m.handle] = ($m | ConvertTo-Json -Depth 20) }
$oldMenuText = ''
Get-ChildItem (Join-Path $snapDir 'menu-footer-*.json') -ErrorAction SilentlyContinue | ForEach-Object { $oldMenuText += (Get-Content $_.FullName -Raw) }

# 3. Article bodies
$artText = ''; $after = $null
do {
  $q = 'query($after:String){ articles(first:100, after:$after){ pageInfo{hasNextPage endCursor} nodes{ body } } }'
  $r = Gql $q @{ after = $after }
  foreach ($a in $r.data.articles.nodes) { $artText += [string]$a.body + "`n" }
  $after = $r.data.articles.pageInfo.endCursor
} while ($r.data.articles.pageInfo.hasNextPage)

# 4. Live sitemap
$smText = ''
try {
  $idx = (Invoke-WebRequest "$site/sitemap.xml" -TimeoutSec 30).Content
  foreach ($mm in [regex]::Matches($idx, '<loc>([^<]+)</loc>')) {
    try { $smText += (Invoke-WebRequest $mm.Groups[1].Value -TimeoutSec 30).Content } catch { Write-Host ("sitemap child failed: " + $mm.Groups[1].Value) -ForegroundColor Yellow }
  }
} catch { Write-Host 'Sitemap fetch failed, inSitemap will be False for all.' -ForegroundColor Yellow }

# 5. Per page checks
$rows = @()
foreach ($p in $pages) {
  $h = $p.handle
  $esc = [regex]::Escape($h)
  $body = [string]$p.body
  $words = @(($body -replace '<[^>]+>', ' ') -split '\s+' | Where-Object { $_ }).Count

  $inMenus = @($menus.Keys | Where-Object { Has $menus[$_] $h })
  $inOld = Has $oldMenuText $h
  $inSitemap = Has $smText $h

  $codeUrl = @(git grep -l -i -P ('/pages/' + $esc + '(?![A-Za-z0-9_-])') -- app components lib '*.config.*' '*.ts' 2>$null)
  $codeQuoted = @(git grep -l -i -P ('[\x22\x27]' + $esc + '[\x22\x27]') -- app components lib 2>$null)
  $docsRef = @(git grep -l -i -F -e ('/pages/' + $h) -- docs/references 2>$null)

  $contentRefs = 0
  if (Has $artText $h) { $contentRefs++ }
  foreach ($o in $pages) { if ($o.id -ne $p.id -and (Has ([string]$o.body) $h)) { $contentRefs++ } }

  $status = ''
  try { $status = (Invoke-WebRequest "$site/pages/$h" -SkipHttpErrorCheck -MaximumRedirection 0 -TimeoutSec 20).StatusCode } catch { $status = 'ERR' }

  $inUse = ($inMenus.Count -gt 0) -or $inOld -or ($codeUrl.Count -gt 0)
  $verdict = 'REVIEW'
  if ($inUse) { $verdict = 'KEEP' }
  elseif (-not $p.isPublished) { $verdict = 'CANDIDATE-unpublished' }
  elseif ($words -lt 30 -or "$status" -ne '200') { $verdict = 'CANDIDATE-empty-or-broken' }

  $rows += [pscustomobject]@{
    verdict = $verdict; handle = $h; title = $p.title; published = $p.isPublished
    template = $p.templateSuffix; words = $words; updated = ([string]$p.updatedAt).Substring(0, 10)
    live = $status; sitemap = $inSitemap; menus = ($inMenus -join '|'); oldFooter = $inOld
    codeUrlFiles = ($codeUrl -join '|'); codeQuotedFiles = ($codeQuoted -join '|'); docs = ($docsRef -join '|'); contentRefs = $contentRefs
  }
}
$csv = Join-Path $outDir 'pages-audit.csv'
$rows | Sort-Object verdict, handle | Export-Csv $csv -NoTypeInformation
Write-Host ("`nSaved: {0}`n" -f $csv)
$rows | Sort-Object verdict, handle | Format-Table verdict, handle, published, words, live, sitemap, menus, oldFooter, contentRefs -AutoSize
$rows | Group-Object verdict | Select-Object Name, Count | Format-Table -AutoSize

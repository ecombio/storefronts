// Finishes the deals-carousel edits. Run from the repo root: node finish-deals.mjs
import fs from "node:fs";
import path from "node:path";

const SERVER = "lib/collections/server.ts";
const ACTION = "lib/collections/action.ts";

function read(file) {
  const raw = fs.readFileSync(file, "utf8");
  return { text: raw.replace(/\r\n/g, "\n"), crlf: raw.includes("\r\n") };
}

function write(file, text, crlf) {
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text);
}

function edit(file, oldStr, newStr, guard) {
  if (!fs.existsSync(file)) return console.log("MISSING  " + file);
  const { text, crlf } = read(file);
  if (text.includes(guard ?? newStr))
    return console.log(
      "ALREADY  " + file + "  (" + oldStr.split("\n")[0].trim().slice(0, 50) + ")",
    );
  const count = text.split(oldStr).length - 1;
  if (count !== 1)
    return console.log(
      "SKIPPED  " + file + "  (anchor found " + count + " times): " + oldStr.split("\n")[0].trim(),
    );
  write(
    file,
    text.replace(oldStr, () => newStr),
    crlf,
  );
  console.log("OK       " + file);
}

// Repairs spaces that a terminal paste dropped in earlier edits. Silent when there is nothing to repair.
function repair(file, pairs) {
  if (!fs.existsSync(file)) return;
  const { text, crlf } = read(file);
  let out = text;
  for (const [bad, good] of pairs) out = out.split(bad).join(good);
  if (out !== text) {
    write(file, out, crlf);
    console.log("REPAIRED " + file);
  }
}

if (!fs.existsSync(SERVER)) {
  console.log("Run this from the repo root (the folder that contains lib/ and components/).");
  process.exit(1);
}

repair(SERVER, [
  ["import{ withProductRatings }", "import { withProductRatings }"],
  ['from"@/lib/product/sale"', 'from "@/lib/product/sale"'],
]);

// 1. The two functions that the earlier interrupted paste never added.
const block = `type CollectionProductsParams = Parameters<typeof fetchCollectionProducts>[0];
type CollectionProductsResult = Awaited<ReturnType<typeof fetchCollectionProducts>>;

// The regular grid holds only full-price products, so one API page can come back short or empty; keep reading until it fills.
const MAX_FILL_PAGES = 4;

export async function fetchCollectionProductsExcludingSale(
  params: CollectionProductsParams,
): Promise<CollectionProductsResult> {
  const first = await fetchCollectionProducts(params);
  const products = first.products.filter((product) => !isOnSale(product));
  let pageInfo = first.pageInfo;
  for (
    let page = 1;
    page < MAX_FILL_PAGES &&
    products.length < PRODUCTS_PER_PAGE &&
    pageInfo.hasNextPage &&
    pageInfo.endCursor;
    page++
  ) {
    const next = await fetchCollectionProducts({ ...params, cursor: pageInfo.endCursor });
    products.push(...next.products.filter((product) => !isOnSale(product)));
    pageInfo = next.pageInfo;
  }
  return { ...first, products, pageInfo };
}

const DEALS_PAGE_SIZE = 100;
const DEALS_MAX_PAGES = 5;

// The Storefront API cannot filter on compare-at price, so deals are found by reading the collection's pages.
async function fetchCollectionDeals(handle: string): Promise<ProductCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("collections", "collection-" + handle);

  const deals: ProductCard[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < DEALS_MAX_PAGES; page++) {
    const result = await fetchCollectionProducts({
      collection: handle,
      limit: DEALS_PAGE_SIZE,
      cursor,
    });
    deals.push(...result.products.filter(isOnSale));
    if (!result.pageInfo.hasNextPage || !result.pageInfo.endCursor) break;
    cursor = result.pageInfo.endCursor;
  }
  tagProducts(deals);
  return deals;
}

export async function getCollectionDeals(params: { handle: string }): Promise<ProductCard[]> {
  return withProductRatings(await fetchCollectionDeals(params.handle));
}

`;
const anchor = "export async function getAllProductsCollection(): Promise<Collection> {";
edit(SERVER, anchor, block + anchor, "export async function fetchCollectionProductsExcludingSale");

// 2. Infinite-scroll action: same exclusion on every extra page.
edit(
  ACTION,
  'import { resolveBrowseParams } from "@/lib/collections/server";',
  'import { fetchCollectionProductsExcludingSale, resolveBrowseParams } from "@/lib/collections/server";',
);
edit(
  ACTION,
  "  search: string;\n}): Promise<{ products: ProductCard[]; pageInfo: PageInfo }> {",
  "  search: string;\n  excludeOnSale?: boolean;\n}): Promise<{ products: ProductCard[]; pageInfo: PageInfo }> {",
  "excludeOnSale?: boolean;",
);
edit(
  ACTION,
  "const result = await fetchCollectionProducts({",
  "const fetchPage = params.excludeOnSale\n    ? fetchCollectionProductsExcludingSale\n    : fetchCollectionProducts;\n  const result = await fetchPage({",
  "const fetchPage = params.excludeOnSale",
);

// 3. Find the page(s) that call getCollectionResultsData, so the last edit can be written against the real file.
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

const roots = ["app", "src"].filter((d) => fs.existsSync(d));
const hits = roots
  .flatMap((r) => walk(r))
  .filter((f) => fs.readFileSync(f, "utf8").includes("getCollectionResultsData("));

console.log("");
if (hits.length === 0) {
  console.log(
    "No file under app/ or src/ calls getCollectionResultsData( . Paste the page file for /collections/[handle].",
  );
}
for (const f of hits) {
  console.log("=== " + f + " ===");
  console.log(fs.readFileSync(f, "utf8"));
}

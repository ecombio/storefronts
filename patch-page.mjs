// Wires the deals carousel into the collection page. Run from the repo root: node patch-page.mjs
import fs from "node:fs";

const FILE = "app/collections/[handle]/page.tsx";

if (!fs.existsSync(FILE)) {
  console.log("Run this from the repo root (the folder that contains app/ and lib/).");
  process.exit(1);
}

const raw = fs.readFileSync(FILE, "utf8");
const crlf = raw.includes("\r\n");
let text = raw.replace(/\r\n/g, "\n");

function edit(oldStr, newStr, guard) {
  if (text.includes(guard)) return console.log("ALREADY  " + guard);
  const count = text.split(oldStr).length - 1;
  if (count !== 1)
    return console.log(
      "SKIPPED  anchor found " + count + " times: " + oldStr.split("\n")[0].trim(),
    );
  text = text.replace(oldStr, () => newStr);
  console.log("OK       " + guard);
}

edit(
  "  getCollectionAfterItemPage,\n  getCollectionProductCount,",
  "  getCollectionAfterItemPage,\n  getCollectionDeals,\n  getCollectionProductCount,",
  "  getCollectionDeals,",
);

edit(
  "  const collectionResultsDataPromise = getCollectionResultsData({\n    handle,\n    searchStatePromise,\n  });\n",
  "  const collectionResultsDataPromise = getCollectionResultsData({\n    handle,\n    searchStatePromise,\n    excludeOnSale: true,\n  });\n  // A failed deals lookup should hide the carousel, not break the page.\n  const dealsPromise = getCollectionDeals({ handle }).catch(() => []);\n",
  "const dealsPromise =",
);

edit(
  "      collectionResultsDataPromise={collectionResultsDataPromise}\n",
  "      collectionResultsDataPromise={collectionResultsDataPromise}\n      dealsPromise={dealsPromise}\n",
  "dealsPromise={dealsPromise}",
);

fs.writeFileSync(FILE, crlf ? text.replace(/\n/g, "\r\n") : text);

// Keep @yotpo/yotpo.md in sync with changes to this route.
// Path: app/api/yotpo/webhook/route.ts
//
// Receives Yotpo review_create / review_updated webhooks and refreshes the cached reviews.
// Auth is a shared secret (YOTPO_WEBHOOK_SECRET) in the callback URL as ?secret= or in the
// x-webhook-secret header. The payload has customer data, so only its field names are logged.

import { timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 64 * 1024;

function authorized(request: Request): boolean {
  const expected = process.env.YOTPO_WEBHOOK_SECRET;
  if (!expected) return false;
  const url = new URL(request.url);
  const given = url.searchParams.get("secret") ?? request.headers.get("x-webhook-secret") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Shopify numeric product ID from the payload, or null if none of the likely fields has one. */
function findProductId(payload: unknown): string | null {
  const data = (payload as { data?: Record<string, unknown> } | null)?.data;
  if (!data) return null;
  const product = data.product as Record<string, unknown> | undefined;
  const candidates = [
    data.product_id,
    data.sku,
    product?.id,
    product?.domain_key,
    product?.external_id,
  ];
  for (const value of candidates) {
    const id = String(value ?? "");
    if (/^\d{6,}$/.test(id)) return id;
  }
  return null;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES)
    return NextResponse.json({ error: "Request too large." }, { status: 413 });

  const payload = (await request.json().catch(() => null)) as {
    event?: string;
    data?: Record<string, unknown>;
  } | null;
  const productId = findProductId(payload);

  console.log(
    "Yotpo webhook:",
    payload?.event ?? "unknown event",
    productId ? "product " + productId : "no product id, refreshing all reviews",
    "fields: " + Object.keys(payload?.data ?? {}).join(","),
  );

  revalidateTag(productId ? `yotpo-reviews-${productId}` : "yotpo-reviews", "max");
  revalidateTag("yotpo-review-selection", "max");
  return NextResponse.json({ ok: true, scope: productId ?? "all" });
}

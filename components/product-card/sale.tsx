export function getSaleInfo(price: string, compareAt?: string) {
  const now = parseFloat(price);
  const was = compareAt ? parseFloat(compareAt) : 0;
  const onSale = Number.isFinite(now) && Number.isFinite(was) && was > now;
  return { onSale, was, savings: onSale ? was - now : 0 };
}

function money(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(
    amount,
  );
}

/** Reserves its height when empty so cards stay aligned in a row. */
export function SaleBadge({ price, compareAt }: { price: string; compareAt?: string }) {
  const { onSale } = getSaleInfo(price, compareAt);
  return (
    <div data-slot="product-card-sale-badge" className="min-h-7 mb-1">
      {onSale ? (
        <span className="inline-flex items-stretch text-[#96F5BD]">
          <svg className="shrink-0" height="24" width="5" aria-hidden="true">
            <path
              d="M5 0H3.2C2.1 0 1.5 0 1.1.2a2 2 0 0 0-.9.9C0 1.5 0 2 0 3.2v4.9l.2.2.6.2c1.7.3 3 1.8 3 3.5s-1.3 3.2-3 3.5l-.6.2-.2.2v4.9c0 1.1 0 1.7.2 2.1.2.4.5.7.9.9.4.2 1 .2 2.1.2H5V0Z"
              fill="currentColor"
            />
          </svg>
          <span className="flex h-6 items-center gap-1 bg-[#96F5BD] text-sm font-bold text-[#0b5a2a]">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12 21.75c-5.385 0-9.75-4.365-9.75-9.75S6.615 2.25 12 2.25s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75m2.864-5.636a1.25 1.25 0 0 0 1.25-1.25v-4.571a.75.75 0 0 0-1.5 0v3.26L9.53 8.47a.75.75 0 1 0-1.06 1.06l5.084 5.084h-3.261a.75.75 0 0 0 0 1.5h4.571" />
            </svg>
            Price drop
          </span>
          <svg className="shrink-0" height="24" width="5" aria-hidden="true">
            <path
              d="M0 0h1.8c1.1 0 1.7 0 2.1.2.4.2.7.5.9.9.2.4.2 1 .2 2.1v4.9l-.2.2-.6.2c-1.7.3-3 1.8-3 3.5s1.3 3.2 3 3.5l.6.2.2.2v4.9c0 1.1 0 1.7-.2 2.1a2 2 0 0 1-.9.9c-.4.2-1 .2-2.1.2H0V0Z"
              fill="currentColor"
            />
          </svg>
        </span>
      ) : null}
    </div>
  );
}

export function SaleSavings({
  price,
  compareAt,
  currencyCode,
}: {
  price: string;
  compareAt?: string;
  currencyCode: string;
}) {
  const { onSale, was, savings } = getSaleInfo(price, compareAt);
  return (
    <div data-slot="product-card-savings" className="min-h-10 text-sm">
      {onSale ? (
        <>
          <div className="font-bold text-positive">Save {money(savings, currencyCode)}</div>
          <div className="text-muted-foreground">
            Was: <span className="line-through">{money(was, currencyCode)}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

// app/components/ProductForm.tsx
import {Link, useNavigate} from 'react-router';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import type {ProductFragment} from 'storefrontapi.generated';

export function ProductForm({
  productOptions,
  selectedVariant,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
}) {
  const navigate = useNavigate();
  const {open} = useAside();

  return (
    <div className="flex flex-col gap-6">
      {productOptions.map((option) => {
        if (option.optionValues.length === 1) return null;

        const isColor = option.name.toLowerCase() === 'color';

        return (
          <div key={option.name}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0a0a0a]">
                {isColor ? option.name : `Select ${option.name}`}
              </span>
              {!isColor && (
                <button
                  type="button"
                  className="text-[12px] text-[#6b6b6b] underline underline-offset-2"
                >
                  Size Guide
                </button>
              )}
            </div>

            {isColor ? (
              <div className="flex gap-3">
                {option.optionValues.map((value) => (
                  <SwatchOption
                    key={option.name + value.name}
                    value={value}
                    navigate={navigate}
                  />
                ))}
              </div>
            ) : (
              <div className="flex rounded-sm border border-[#e5e5e5] divide-x divide-[#e5e5e5]">
                {option.optionValues.map((value) => (
                  <SizeChip
                    key={option.name + value.name}
                    value={value}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-3">
        <AddToCartButton
          disabled={!selectedVariant || !selectedVariant.availableForSale}
          onClick={() => open('cart')}
          lines={
            selectedVariant
              ? [
                  {
                    merchandiseId: selectedVariant.id,
                    quantity: 1,
                    selectedVariant,
                  },
                ]
              : []
          }
          className="w-full h-[52px] rounded-full bg-[#0a0a0a] text-white font-[Barlow_Condensed] font-bold text-[17px] uppercase tracking-[0.1em] disabled:opacity-40"
        >
          {selectedVariant?.availableForSale ? 'Add to Bag' : 'Out of Stock'}
        </AddToCartButton>

        <button
          type="button"
          disabled={!selectedVariant || !selectedVariant.availableForSale}
          className="w-full h-[52px] rounded-full border-[1.5px] border-[#0a0a0a] text-[#0a0a0a] font-[Barlow_Condensed] font-bold text-[17px] uppercase tracking-[0.1em] disabled:opacity-40"
        >
          Buy Now
        </button>

        <p className="text-center text-[12px] text-[#6b6b6b] leading-relaxed">
          <span className="font-semibold text-[#0a0a0a]">Pay in 4</span>{' '}
          interest-free payments on purchases of $30–$1,500.{' '}
          <span className="underline underline-offset-2">Learn more</span>
        </p>
      </div>
    </div>
  );
}

type OptionValue = MappedProductOptions['optionValues'][number];

function SwatchOption({
  value,
  navigate,
}: {
  value: OptionValue;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const {name, handle, variantUriQuery, selected, available, isDifferentProduct, swatch} =
    value;

  const content = <ProductOptionSwatch swatch={swatch} name={name} />;

  const className = `h-13 w-13 rounded-sm overflow-hidden ring-offset-2 ${
    selected ? 'ring-2 ring-[#0a0a0a]' : 'ring-1 ring-[#e5e5e5]'
  } ${available ? '' : 'opacity-30'}`;

  if (isDifferentProduct) {
    return (
      <Link
        className={className}
        prefetch="intent"
        preventScrollReset
        replace
        to={`/products/${handle}?${variantUriQuery}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={!value.exists}
      onClick={() => {
        if (!selected) {
          navigate(`?${variantUriQuery}`, {
            replace: true,
            preventScrollReset: true,
          });
        }
      }}
    >
      {content}
    </button>
  );
}

function SizeChip({
  value,
  navigate,
}: {
  value: OptionValue;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const {name, handle, variantUriQuery, selected, available, exists, isDifferentProduct} =
    value;

  const className = `flex-1 h-12 flex items-center justify-center text-[14px] font-medium ${
    selected
      ? 'bg-[#0a0a0a] text-white'
      : available
        ? 'bg-white text-[#0a0a0a]'
        : 'bg-white text-[#c0c0c0] line-through'
  }`;

  if (isDifferentProduct) {
    return (
      <Link
        className={className}
        prefetch="intent"
        preventScrollReset
        replace
        to={`/products/${handle}?${variantUriQuery}`}
      >
        {name}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={!exists || !available}
      onClick={() => {
        if (!selected) {
          navigate(`?${variantUriQuery}`, {
            replace: true,
            preventScrollReset: true,
          });
        }
      }}
    >
      {name}
    </button>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[10px] uppercase bg-[#f5f5f5]">
        {name}
      </div>
    );
  }

  return (
    <div
      aria-label={name}
      className="h-full w-full"
      style={{backgroundColor: color || 'transparent'}}
    >
      {image && (
        <img src={image} alt={name} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

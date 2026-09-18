// app/components/product-detail/ProductForm/ProductForm.tsx
import {useNavigate} from 'react-router';
import {type MappedProductOptions} from '@shopify/hydrogen';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import type {ProductFragment} from 'storefrontapi.generated';
import {SwatchOption} from './SwatchOption';
import {SizeChip} from './SizeChip';

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

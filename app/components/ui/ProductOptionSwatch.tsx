import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';

export function ProductOptionSwatch({
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

import {Link, type useNavigate} from 'react-router';
import {ProductOptionSwatch} from './ProductOptionSwatch';
import type {OptionValue} from './types';

export function SwatchOption({
  value,
  navigate,
}: {
  value: OptionValue;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const {
    name,
    handle,
    variantUriQuery,
    selected,
    available,
    isDifferentProduct,
    swatch,
  } = value;

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

import {Link, type useNavigate} from 'react-router';
import type {OptionValue} from './types';

export function SizeChip({
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

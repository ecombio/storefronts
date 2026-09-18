// app/components/ProductAccordion.tsx
import {useState} from 'react';

export function ProductAccordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#e5e5e5]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#0a0a0a]">
          {title}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200"
          style={{transform: open ? 'rotate(90deg)' : 'rotate(0deg)'}}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-200"
        style={{maxHeight: open ? 500 : 0}}
      >
        <div className="pb-4">{children}</div>
      </div>
    </div>
  );
}

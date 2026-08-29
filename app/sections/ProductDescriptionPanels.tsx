import {useEffect, useRef, useState} from 'react';

type PanelKey = 'description' | 'shipping' | 'refund' | 'warranty';

/**
 * Ported from snippets/product-description.liquid +
 * assets/product-description.js. Styles live in main-product.css
 * (.pd-wrap, .pd-panel, .pd-overlay, etc.).
 *
 * Simplified vs the Liquid version: only one panel is mounted at a
 * time (the active one), rather than all four pre-rendered and
 * toggled via classes — same visual result, less DOM.
 *
 * Pass in already-resolved HTML strings; see products.$handle.tsx for
 * how these are sourced (product.descriptionHtml, shop policies, and
 * the custom.product_policy metaobject override).
 */
export function ProductDescriptionPanels({
  descriptionHtml,
  shippingHtml,
  refundHtml,
  warrantyHtml,
}: {
  descriptionHtml?: string | null;
  shippingHtml?: string | null;
  refundHtml?: string | null;
  warrantyHtml?: string | null;
}) {
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const panels: Array<{key: PanelKey; label: string; html?: string | null}> = [
    {key: 'description', label: 'Description', html: descriptionHtml},
    {key: 'shipping', label: 'Shipping Policy', html: shippingHtml},
    {key: 'refund', label: 'Refund & Return Policy', html: refundHtml},
    {key: 'warranty', label: 'Warranty', html: warrantyHtml},
  ].filter((p) => p.html);

  useEffect(() => {
    if (!openPanel) return;

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeydown);
    document.body.style.overflow = 'hidden';
    const timeout = setTimeout(() => panelRef.current?.focus(), 50);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPanel]);

  function open(key: PanelKey) {
    lastFocusRef.current = document.activeElement as HTMLElement;
    setOpenPanel(key);
  }

  function close() {
    setOpenPanel(null);
    lastFocusRef.current?.focus();
  }

  if (!panels.length) return null;

  const active = panels.find((p) => p.key === openPanel);

  return (
    <>
      <div className="pd-wrap">
        {panels.map((panel) => (
          <div className="pd-row" key={panel.key}>
            <button
              className="pd-trigger"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={openPanel === panel.key}
              aria-controls={`PdPanel-${panel.key}`}
              onClick={() => open(panel.key)}
            >
              <span>{panel.label}</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M7.5 5L12.5 10L7.5 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div
        className={`pd-overlay${openPanel ? ' is-visible is-open' : ''}`}
        aria-hidden={!openPanel}
        onClick={close}
      />

      {active && (
        <div
          className="pd-panel is-open"
          id={`PdPanel-${active.key}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`PdTitle-${active.key}`}
          tabIndex={-1}
          ref={panelRef}
        >
          <div className="pd-panel__header">
            <h2 className="pd-panel__title" id={`PdTitle-${active.key}`}>
              {active.label}
            </h2>
            <button className="pd-panel__close" type="button" aria-label="Close" onClick={close}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 4L16 16M16 4L4 16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="pd-panel__body" dangerouslySetInnerHTML={{__html: active.html ?? ''}} />
        </div>
      )}
    </>
  );
}

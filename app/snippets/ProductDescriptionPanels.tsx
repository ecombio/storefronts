import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

export type DescriptionPanelItem = {
  /** Stable id, used to build DOM ids and match open/trigger state. */
  id: string;
  /** Trigger row label and panel header title. */
  title: string;
  /** Rich text HTML body. Panels with empty/blank html are not rendered. */
  html: string;
};

/**
 * Row-of-triggers + slide-in-panel version of the PDP's info accordion
 * (Description / Shipping Policy / Refund & Return Policy / Warranty).
 * Ported from a Liquid reference (pd-wrap/pd-trigger/pd-panel markup +
 * product-description.css/js) — panel slides in from the right on
 * desktop, from the bottom on mobile (see assets/product-description.css),
 * instead of expanding inline like a standard accordion.
 *
 * Only one panel can be open at a time. The overlay + panel are
 * portaled to document.body (mirroring the original JS's
 * `appendChild` calls) so fixed positioning and stacking are never
 * affected by where this component sits in the tree.
 */
export function ProductDescriptionPanels({
  panels,
}: {
  panels: DescriptionPanelItem[];
}) {
  const visiblePanels = panels.filter((panel) => panel.html?.trim());

  const [openId, setOpenId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!openId) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => panelRefs.current[openId]?.focus(), 50);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [openId]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (!openId) return;

      if (event.key === 'Escape') {
        closePanel();
        return;
      }

      if (event.key !== 'Tab') return;

      const panelEl = panelRefs.current[openId];
      if (!panelEl) return;

      const focusable = panelEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [openId]);

  function openPanel(id: string) {
    lastFocusRef.current = document.activeElement as HTMLElement;
    setOpenId(id);
  }

  function closePanel() {
    setOpenId(null);
    lastFocusRef.current?.focus();
  }

  if (!visiblePanels.length) return null;

  return (
    <div className="product-description-panels">
      <div className="pdp-trigger-list">
        {visiblePanels.map((panel) => (
          <div className="pdp-trigger-row" key={panel.id}>
            <button
              type="button"
              className="pdp-trigger"
              aria-haspopup="dialog"
              aria-expanded={openId === panel.id}
              aria-controls={`pdp-panel-${panel.id}`}
              onClick={() => openPanel(panel.id)}
            >
              <span>{panel.title}</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
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

      {mounted &&
        createPortal(
          <>
            <div
              className={`pdp-overlay${openId ? ' is-visible is-open' : ''}`}
              aria-hidden={openId ? 'false' : 'true'}
              onClick={closePanel}
            />
            {visiblePanels.map((panel) => (
              <div
                key={panel.id}
                id={`pdp-panel-${panel.id}`}
                className={`pdp-panel${openId === panel.id ? ' is-open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`pdp-title-${panel.id}`}
                aria-hidden={openId === panel.id ? 'false' : 'true'}
                tabIndex={-1}
                ref={(el) => {
                  panelRefs.current[panel.id] = el;
                }}
              >
                <div className="pdp-panel-header">
                  <h2 className="pdp-panel-title" id={`pdp-title-${panel.id}`}>
                    {panel.title}
                  </h2>
                  <button
                    type="button"
                    className="pdp-panel-close"
                    aria-label="Close"
                    onClick={closePanel}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 4L16 16M16 4L4 16"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                <div
                  className="pdp-panel-body"
                  dangerouslySetInnerHTML={{__html: panel.html}}
                />
              </div>
            ))}
          </>,
          document.body,
        )}
    </div>
  );
}
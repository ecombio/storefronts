// app/snippets/ReviewModal.tsx
import {useEffect, useRef, useState} from 'react';
import {readJson} from '~/lib/utils';

// Matches Yotpo's own star-rating fieldset labels exactly (see their
// rendered aria-labels: "Score 1 Very poor" ... "Score 5 Great!").
const SCORE_LABELS: Record<number, string> = {
  1: 'Very poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Great!',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Custom "write a review" modal, submitting directly to Yotpo's Create
 * Review API (POST /v1/widget/reviews) via the /api/reviews resource
 * route, instead of relying on Yotpo's embedded widget UI.
 *
 * This mirrors the approach StarRating.tsx already took for reading
 * data (bypassing Yotpo's on-site widget in favor of the documented
 * API) — here for writing data. Yotpo doesn't expose a public JS API
 * to open its own widget's review form programmatically, so triggering
 * it from a separate button (like StarRating's empty-state CTA) would
 * mean depending on Yotpo's internal, undocumented DOM/class names.
 * This avoids that entirely.
 *
 * Yotpo's Create Review endpoint always creates reviews as anonymous
 * and sends a verification email to the address provided — the review
 * won't show up live immediately even on success.
 */
export function ReviewModal({
  productId,
  productTitle,
  productUrl,
  productImageUrl,
  onClose,
  onSubmitted,
}: {
  productId: string;
  productTitle: string;
  productUrl: string;
  productImageUrl?: string;
  onClose: () => void;
  /** Called after a confirmed-successful submission, before the modal closes. */
  onSubmitted?: () => void;
}) {
  const [score, setScore] = useState(0);
  const [hoveredScore, setHoveredScore] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Modal open/close side effects: this component is marked
  // role="dialog" aria-modal="true", which is a contract that keyboard
  // and screen-reader users can rely on — Escape closes it, Tab stays
  // trapped inside it, focus lands inside it on open and returns to
  // whatever triggered it on close, and the page behind it doesn't
  // scroll. None of that comes for free from the ARIA attributes alone;
  // it has to be wired up explicitly.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the panel itself first — works identically whether the
    // form or the success state is showing, unlike targeting a
    // specific field that may not exist in both states.
    panelRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

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

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit =
    score > 0 &&
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    status !== 'submitting';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus('submitting');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          productId,
          productTitle,
          productUrl,
          productImageUrl,
          score,
          title,
          content,
          displayName,
          email,
        }),
      });

      const data = await readJson<{error?: string}>(res);

      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data?.error ?? 'Something went wrong submitting your review.');
        return;
      }

      setStatus('success');
      onSubmitted?.();
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong submitting your review.');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Write a review for ${productTitle}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '90%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: '"Nunito Sans", sans-serif',
          outline: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{fontSize: '18px', fontWeight: 700, margin: 0, color: '#2c2c2c'}}>
              Share your experience
            </h2>
            <p style={{fontSize: '13px', color: '#60646C', margin: '4px 0 0'}}>
              * required fields
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: 1,
              color: '#99A1AF',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {status === 'success' ? (
          <div>
            <p style={{color: '#2c2c2c', fontSize: '15px'}}>
              Thanks! We've sent a verification email to <strong>{email}</strong> —
              confirm it there to publish your review.
            </p>
            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  marginTop: '12px',
                  padding: '10px 24px',
                  background: '#1c2024',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <fieldset style={{border: 'none', padding: 0, margin: 0}}>
              <legend style={{fontSize: '14px', fontWeight: 700, marginBottom: '6px', padding: 0, color: '#1c2024'}}>
                Rate your experience <span aria-hidden="true">*</span>
              </legend>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <div
                  style={{display: 'flex', gap: '4px'}}
                  onMouseLeave={() => setHoveredScore(0)}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScore(value)}
                      onMouseEnter={() => setHoveredScore(value)}
                      onFocus={() => setHoveredScore(value)}
                      onBlur={() => setHoveredScore(0)}
                      aria-label={`Score ${value} ${SCORE_LABELS[value]}`}
                      aria-pressed={score === value}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '28px',
                        lineHeight: 1,
                        color: value <= (hoveredScore || score) ? '#FFE000' : '#D8D8D8',
                        padding: 0,
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {/* Mirrors Yotpo's own rating fieldset: shows the label for
                    whichever star is hovered/focused, falling back to the
                    label for the committed score once one's selected. */}
                <span
                  aria-hidden="true"
                  style={{fontSize: '14px', color: '#2c2c2c', minHeight: '1em'}}
                >
                  {SCORE_LABELS[hoveredScore || score] ?? ''}
                </span>
              </div>
            </fieldset>

            <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
              <label htmlFor="review-title" style={{fontSize: '14px', fontWeight: 700, color: '#1c2024'}}>
                A short title for your review <span aria-hidden="true">*</span>
              </label>
              <input
                id="review-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={50}
                placeholder="e.g., Great quality and fast delivery"
                style={inputStyle}
              />
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
              <label htmlFor="review-content" style={{fontSize: '14px', fontWeight: 700, color: '#1c2024'}}>
                Write your review <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="review-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={4}
                maxLength={5000}
                placeholder="e.g., I loved the fabric, but shipping took longer than expected"
                style={{...inputStyle, resize: 'vertical'}}
              />
            </div>

            <hr style={{border: 'none', borderTop: '1px solid #e3e3e3', margin: 0, width: '100%'}} />

            <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
              <label htmlFor="review-name" style={{fontSize: '14px', fontWeight: 700, color: '#1c2024'}}>
                Your name <span aria-hidden="true">*</span>
              </label>
              <p style={{fontSize: '12px', color: '#60646C', margin: 0}}>
                This will appear publicly with your review
              </p>
              <input
                id="review-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={80}
                autoComplete="name"
                style={inputStyle}
              />
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
              <label htmlFor="review-email" style={{fontSize: '14px', fontWeight: 700, color: '#1c2024'}}>
                Your email address <span aria-hidden="true">*</span>
              </label>
              <p style={{fontSize: '12px', color: '#60646C', margin: 0}}>
                We'll use this only to verify your review. It won't be shown publicly.
              </p>
              <input
                id="review-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={inputStyle}
              />
            </div>

            {status === 'error' && errorMessage && (
              <p style={{color: '#B91C1C', fontSize: '13px', margin: 0}}>{errorMessage}</p>
            )}

            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  padding: '10px 24px',
                  background: canSubmit ? '#1c2024' : '#D8D8D8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  fontSize: '15px',
                }}
              >
                {status === 'submitting' ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '4px',
  border: '1px solid #D9D9E0',
  fontSize: '14px',
  fontFamily: '"Nunito Sans", sans-serif',
};

// app/components/blogs/FaqSection.tsx
//
// FAQ accordion for blog articles, with two entry points:
//
//   1. `<FaqSection>` — a real component, for devs who want to hardcode
//      a FAQ block directly into a .tsx template. Renders a heading
//      plus the accordion.
//   2. `injectFaqSections(html)` — a server-side HTML transform, for
//      content authored in the Shopify blog editor. Scans article HTML
//      for `<script type="application/json" data-faq>[...]</script>`
//      marker blocks and replaces each with static accordion markup
//      (no heading — see below) plus an FAQPage JSON-LD block.
//
// Both share the same .accordion / .accordion__item / .accordion__summary
// / .accordion__icon / .accordion__content markup and classes already
// styled in app/assets/article.css.
//
// Why a <script> marker and not a div attribute (e.g. data-faq="[...]"):
// cramming a JSON array into an HTML attribute value means every quote,
// apostrophe (e.g. "What's the difference...") and newline in the
// questions/answers has to be hand-escaped by whoever is editing the
// article in Shopify's HTML source view. A script block lets them paste
// ordinary JSON with none of that — same reasoning that keeps GraphQL
// query bodies here as plain strings rather than something fussier.
//
// Why no client-side hydration step (unlike the shoppable-embed system
// in ProductGallery.tsx): FaqSection has no hooks that need a React
// context provider, and <details>/<summary> is natively interactive
// with zero JS. So injectFaqSections can render straight to final HTML
// with renderToStaticMarkup and nothing further needs to happen on the
// client — no slots, no portals, no Article.tsx changes required.
//
// Why the injected version omits the "Frequently Asked Questions"
// heading that <FaqSection> renders by default: articles that already
// hand-author an <h2>Frequently Asked Questions</h2> above their FAQ
// content (as this site's articles already do) would otherwise get a
// duplicate heading. The marker only replaces the accordion itself;
// editors keep authoring their own heading exactly as before.

import {renderToStaticMarkup} from 'react-dom/server';
import {useId} from 'react';

export type FaqItem = {
  id?: string;
  question: string;
  answer: React.ReactNode;
  defaultOpen?: boolean;
};

export interface FaqSectionProps {
  items: FaqItem[];
  title?: string | null;
  structuredData?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function toStructuredDataJson(items: FaqItem[]): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items
      .filter((item): item is FaqItem & {answer: string} => typeof item.answer === 'string')
      .map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {'@type': 'Answer', text: item.answer},
      })),
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function FaqAccordionItem({item}: {item: FaqItem}) {
  const generatedId = useId().replace(/:/g, '');
  const id = item.id ?? `faq-${slugify(item.question) || generatedId}`;

  return (
    <details className="accordion__item" id={id} open={item.defaultOpen}>
      <summary className="accordion__summary">
        {item.question}
        <span className="accordion__icon" />
      </summary>
      <div className="accordion__content">
        {typeof item.answer === 'string' ? <p>{item.answer}</p> : item.answer}
      </div>
    </details>
  );
}

export function FaqSection({
  items,
  title = 'Frequently Asked Questions',
  structuredData = true,
}: FaqSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="faq-section" aria-labelledby={title ? 'faq-section-heading' : undefined}>
      {title && (
        <h2 id="faq-section-heading" className="faq-section__heading">
          {title}
        </h2>
      )}

      <div className="accordion">
        {items.map((item) => (
          <FaqAccordionItem key={item.id ?? item.question} item={item} />
        ))}
      </div>

      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: toStructuredDataJson(items)}} />
      )}
    </section>
  );
}

const FAQ_MARKER = /<script type="application\/json" data-faq>([\s\S]*?)<\/script>/g;

export function injectFaqSections(html: string): string {
  return html.replace(FAQ_MARKER, (full, rawJson: string) => {
    let items: unknown;
    try {
      items = JSON.parse(rawJson);
    } catch {
      return full;
    }

    if (!Array.isArray(items) || items.length === 0) return full;

    return renderToStaticMarkup(
      <>
        <div className="accordion">
          {(items as FaqItem[]).map((item, i) => (
            <FaqAccordionItem key={item.id ?? `${item.question}-${i}`} item={item} />
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: toStructuredDataJson(items as FaqItem[])}} />
      </>,
    );
  });
}
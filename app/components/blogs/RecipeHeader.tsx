// app/components/blogs/RecipeHeader.tsx
//
// Printable recipe info card for blog articles, added via a
// `data-recipe-header` marker written directly in Shopify's blog
// HTML source view — same editor-facing convention as
// data-shoppable-product, data-faq, data-newsletter-form, and
// data-two-col.
//
// PURELY STATIC, same reasoning as TwoColumnContent.tsx: nothing here
// needs to fetch data or hydrate into a React component. The one bit
// of interactivity — the "Print recipe" button — is handled with a
// plain inline onclick, not a portaled component, because
// window.print() needs nothing from this app's React tree (no
// Router context, no fetcher, no cart/aside context — contrast with
// NewsletterForm's useFetcher(), which is exactly why THAT one needs
// a portal and this one doesn't).
//
// Editor-facing marker syntax — all attributes optional, but at
// least one of the four stat fields or an image is required (see
// "malformed input" below):
//
//   <div
//     data-recipe-header
//     data-recipe-title="Recipe informations"
//     data-recipe-image="https://cdn.shopify.com/.../cupcake.jpg"
//     data-recipe-image-alt="Frosted cupcake on a plate"
//     data-recipe-prep-time="10 minutes"
//     data-recipe-cook-time="10 minutes"
//     data-recipe-servings="8 persons"
//     data-recipe-category="Desserts"
//   ></div>
//
// data-recipe-title defaults to "Recipe informations" when omitted.
// Any of the four stat attributes can be left out — only the stats
// that are present render, so a recipe with no meaningful "servings"
// value (e.g. a sauce or a drink) can simply omit that attribute
// rather than showing a blank or a fabricated placeholder.
//
// PRINT BEHAVIOR: clicking "Print recipe" adds a `recipe-printing`
// class to <body>, calls window.print(), then removes the class on
// the browser's `afterprint` event (registered once, guarded against
// duplicate registration if more than one recipe header appears in
// the same article). recipe-header.css uses that class with the
// classic visibility-based "print only this element" trick — hiding
// everything else on the page and making only the card visible —
// which works regardless of what the rest of the page's DOM looks
// like (header, nav, footer, other article content), unlike a
// display:none approach that would need to know the page structure
// to selectively hide siblings.
//
// KNOWN LIMITATION: some mobile browsers treat window.print() as
// non-blocking, so `afterprint` is the correct signal to remove the
// class rather than doing it synchronously right after the call —
// removing it immediately after print() could revert the page
// before the print dialog has actually rendered on those browsers.
//
// KNOWN LIMITATION (multi-header articles): the print-isolation CSS
// in recipe-header.css targets the shared `.recipe-header` class, not
// a specific card, so clicking "Print recipe" on any one card in an
// article with multiple recipe headers currently prints all of them.
// See recipe-header.md for editor-facing guidance until this is
// addressed.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MARKER_REGEX = /<div([^>]*\bdata-recipe-header\b[^>]*)>\s*<\/div>/g;

const TITLE_ATTR_REGEX = /\bdata-recipe-title=["']([^"']*)["']/;
const IMAGE_ATTR_REGEX = /\bdata-recipe-image=["']([^"']*)["']/;
const IMAGE_ALT_ATTR_REGEX = /\bdata-recipe-image-alt=["']([^"']*)["']/;
const PREP_TIME_ATTR_REGEX = /\bdata-recipe-prep-time=["']([^"']*)["']/;
const COOK_TIME_ATTR_REGEX = /\bdata-recipe-cook-time=["']([^"']*)["']/;
const SERVINGS_ATTR_REGEX = /\bdata-recipe-servings=["']([^"']*)["']/;
const CATEGORY_ATTR_REGEX = /\bdata-recipe-category=["']([^"']*)["']/;

const DEFAULT_TITLE = 'Recipe informations';

// Minimal inline outline icons matching the four stat types, kept as
// raw SVG strings (not a React icon library) since this whole
// component is a server-side string transform, not a mounted
// component.
const ICON_CLOCK =
  '<svg class="recipe-header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const ICON_PERSON =
  '<svg class="recipe-header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/></svg>';
const ICON_CATEGORY =
  '<svg class="recipe-header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/></svg>';
const ICON_PRINT =
  '<svg class="recipe-header__print-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M6 14h12v7H6z"/></svg>';

type RecipeStat = {icon: string; label: string; value: string};

/**
 * Builds one <div class="recipe-header__stat"> block for a single
 * present attribute — icon + bold label + value, matching the
 * two-per-row layout in recipe-header.css.
 */
function statHtml({icon, label, value}: RecipeStat): string {
  return (
    `<div class="recipe-header__stat">` +
    `${icon}` +
    `<div class="recipe-header__stat-text">` +
    `<dt class="recipe-header__stat-label">${escapeHtml(label)}</dt>` +
    `<dd class="recipe-header__stat-value">${escapeHtml(value)}</dd>` +
    `</div>` +
    `</div>`
  );
}

// Registered once, guarded, so this still works correctly if an
// article has more than one recipe header — every button's onclick
// calls the same global function rather than each carrying its own
// copy of the print logic inline.
const PRINT_SCRIPT = `
<script>
(function () {
  if (window.__recipeHeaderPrintReady) return;
  window.__recipeHeaderPrintReady = true;
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('recipe-printing');
  });
  window.__printRecipeHeader = function () {
    document.body.classList.add('recipe-printing');
    window.print();
  };
})();
</script>`;

/**
 * Scans article HTML for `data-recipe-header` markers and rewrites
 * each into a static, print-ready recipe info card. Pure string
 * transform, run once in the loader — same shape as
 * injectNewsletterForm/injectFaqSections.
 */
export function injectRecipeHeader(html: string): string {
  let printScriptEmitted = false;

  return html.replace(MARKER_REGEX, (full, attrs: string) => {
    const title = attrs.match(TITLE_ATTR_REGEX)?.[1] ?? DEFAULT_TITLE;
    const image = attrs.match(IMAGE_ATTR_REGEX)?.[1];
    const imageAlt = attrs.match(IMAGE_ALT_ATTR_REGEX)?.[1] ?? '';
    const prepTime = attrs.match(PREP_TIME_ATTR_REGEX)?.[1];
    const cookTime = attrs.match(COOK_TIME_ATTR_REGEX)?.[1];
    const servings = attrs.match(SERVINGS_ATTR_REGEX)?.[1];
    const category = attrs.match(CATEGORY_ATTR_REGEX)?.[1];

    const stats: RecipeStat[] = [];
    if (prepTime) stats.push({icon: ICON_CLOCK, label: 'Prep time', value: prepTime});
    if (cookTime) stats.push({icon: ICON_CLOCK, label: 'Cooking time', value: cookTime});
    if (servings) stats.push({icon: ICON_PERSON, label: 'Servings', value: servings});
    if (category) stats.push({icon: ICON_CATEGORY, label: 'Category', value: category});

    // Nothing meaningful to render (no image, no stats) — leave the
    // marker untouched rather than rendering an empty card. Same
    // fail-safe reasoning as the shoppable-slot scan skipping slots
    // with no product ids.
    if (!image && stats.length === 0) return full;

    const imageHtml = image
      ? `<img class="recipe-header__image" src="${escapeHtml(image)}" alt="${escapeHtml(imageAlt)}" loading="lazy" />`
      : `<div class="recipe-header__image recipe-header__image--placeholder" role="img" aria-label="${escapeHtml(imageAlt || 'Recipe photo not provided')}"></div>`;

    const statsHtml = stats.length
      ? `<dl class="recipe-header__stats">${stats.map(statHtml).join('')}</dl>`
      : '';

    // Emit the shared print script once per article, immediately
    // before the first recipe header that needs it — keeps it
    // co-located with what uses it rather than requiring a separate
    // global <script> registration elsewhere.
    const scriptHtml = printScriptEmitted ? '' : PRINT_SCRIPT;
    printScriptEmitted = true;

    return (
      `${scriptHtml}` +
      `<div class="recipe-header">` +
      `${imageHtml}` +
      `<div class="recipe-header__body">` +
      `<div class="recipe-header__heading-row">` +
      `<h3 class="recipe-header__title">${escapeHtml(title)}</h3>` +
      `<button type="button" class="recipe-header__print" onclick="window.__printRecipeHeader()">` +
      `${ICON_PRINT}<span>Print recipe</span>` +
      `</button>` +
      `</div>` +
      `${statsHtml}` +
      `</div>` +
      `</div>`
    );
  });
}
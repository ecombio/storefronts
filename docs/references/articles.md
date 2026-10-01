# Blog Articles Guide

How blog content works on the Ecombio storefront, and how to write articles that use accordions, buttons, and product strips. Ecombio is a **micro-mobility** site (electric scooters, e-bikes, and the gear and know-how around them), and this guide is the single source of truth for blog format, data, and standards.

- [Quick reference](#quick-reference)
- [Editorial scope](#editorial-scope)
- [URL structure](#url-structure)
- [Writing an article](#writing-an-article)
- [Anatomy of an ideal post](#anatomy-of-an-ideal-post)
- [Shortcodes](#shortcodes)
- [Automatic features](#automatic-features)
- [Categories and tags](#categories-and-tags)
- [Authors](#authors)
- [Article data (metafields)](#article-data-metafields)
- [SEO fields](#seo-fields)
- [Pre-publish checklist](#pre-publish-checklist)
- [Full example](#full-example)
- [Bulk edits and publishing](#bulk-edits-and-publishing)
- [Troubleshooting](#troubleshooting)
- [For developers](#for-developers)

---

## Quick reference

| I want to...                | Do this                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| Add an FAQ                  | `<p>[accordion: Question?]</p>` ... `<p>[/accordion]</p>`          |
| Show products               | `<p>[products: Title \| /collections/x \| handle-1, handle-2]</p>` |
| Add a call-to-action button | `<p>[button: /collections/electric-scooters \| Shop scooters]</p>` |
| Get a Contents sidebar      | Use two or more **Heading 2** sections                             |
| Show an author card         | Set the `author_profile` metafield on the post                     |
| Put a post in a category    | Pick the right **blog** (the blog is the category)                 |
| Avoid broken shortcodes     | One shortcode per `<p>`, saved from the **HTML view**              |
| Take a post offline         | Set it to **Draft** (the URL returns 404 and leaves the sitemap)   |

Never put an H1 in the body. The post title is already the H1.

---

## Editorial scope

Ecombio covers **micro-mobility**: small, light, mostly electric vehicles for short trips.

**Core topics**

- Electric scooters (commuter, off-road, folding, heavy-rider, budget, premium)
- Electric bikes (commuter, mountain, classes, motors, batteries)
- Other personal electric vehicles, as the catalog grows (e-skateboards, electric unicycles, hoverboards, e-mopeds, kick scooters)
- Rider guides: safety, helmets, laws, maintenance, batteries, brakes, range, troubleshooting, accessories

**Out of scope for the blog**

- Pages that are really taxonomy or profile stubs (a post titled "Cycling" or "Electric Scooters" is not an article)
- Test or demo posts (Button, Quote, FAQ Section, and similar). They should not be live.
- Athlete profiles or lifestyle content unrelated to a vehicle, unless there is a clear editorial reason

**Writing standards**

- Write original posts from our own catalog. Never copy competitor text.
- Recommend only products we sell, using real, published handles.
- Verify anything that changes often (laws, rebates, insurance, model specs, prices) before publishing, and date the post.
- Answer the reader's question in the first paragraph, then go deeper.

---

## URL structure

| URL                                     | What it shows                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/blogs/category/{blog-handle}`         | A category page (one per Shopify blog). Hero article, article grid, Featured list, tag chips. |
| `/blogs/author/{author-handle}`         | An author page: profile, topic chips, and every article they wrote.                           |
| `/blogs/tag/{tag-handle}`               | Every article with that tag, across all blogs.                                                |
| `/blogs/articles/{article-handle}`      | A single article.                                                                             |
| `/blogs/{blog-handle}`                  | Redirects (308) to `/blogs/category/{blog-handle}`.                                           |
| `/blogs/{blog-handle}/{article-handle}` | Redirects (308) to `/blogs/articles/{article-handle}`.                                        |

Always link to the canonical URLs (`/blogs/category/...`, `/blogs/articles/...`, `/blogs/tag/...`, `/blogs/author/...`). Old URLs keep working through redirects, but they add an extra hop.

Important URL facts:

- An article URL is `/blogs/articles/{handle}` **whichever blog the post is in**. Moving a post to another blog changes its category page but not its article URL.
- Changing an article's **handle** changes its URL. Do not do it on a live, indexed post without a redirect.
- Unpublishing a post (Draft) makes its article URL return 404 and removes it from the sitemap once the cache refreshes. Republishing reverses it.

**Tag handles** are made from the tag text: lowercase, `&` becomes `and`, and anything that is not a letter or number becomes a hyphen. "Stretching & Mobility" becomes `stretching-and-mobility`.

---

## Writing an article

1. In Shopify admin, go to **Content → Blog posts** and open or create a post.
2. Set the **title**, **featured image**, **author**, **blog** (this is the category), and **tags**.
3. Set the **`author_profile`** metafield (see [Authors](#authors)).
4. Fill in the **summary**, **SEO title**, and **SEO description** (see [SEO fields](#seo-fields)).
5. Write the body. Normal text, headings, lists, images, and links all work.
6. For accordions, buttons, and product strips, switch to the **HTML view** (the `</>` button) and add shortcodes (see below).
7. Save, then run the [pre-publish checklist](#pre-publish-checklist) before setting the post live.

Rules that keep things working:

- **Do not add an H1 to the body.** The page already renders the post title as the H1. Start the body with a paragraph, and use **Heading 2** for sections.
- **Save from the HTML view.** Switching back to the visual editor can reformat the HTML and break shortcodes.
- Every shortcode must sit in **its own paragraph**: `<p>[...]</p>`.

---

## Anatomy of an ideal post

Use `best-electric-bikes-guide` (3,243 words, FAQ and product blocks) as the working model for a buying guide.

**Fields**

| Field                 | Standard                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Title                 | Clear and specific. Renders as the H1. Include the main topic words and the year when it matters. |
| Handle                | Short, lowercase, hyphenated. Set it once and leave it.                                           |
| Featured image        | **Required.** Landscape. Without one, "You may like" shows a gray box.                            |
| Blog (category)       | The one that best fits the post (see [Categories and tags](#categories-and-tags)).                |
| Tags                  | Two or three from the shared vocabulary. No near-duplicates.                                      |
| Author                | `author_profile` set, so the byline links and the author card shows.                              |
| Summary               | One or two sentences that stand on their own.                                                     |
| SEO title/description | Set both (see [SEO fields](#seo-fields)).                                                         |

**Body**

| Element        | Standard                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| Intro          | One short paragraph, no heading above it. Answers the question fast.                                 |
| Sections       | Two or more **Heading 2** sections, which builds the Contents sidebar. Use H3 for sub-points.        |
| Length         | 1,000+ words for a guide. Under 1,000 is treated as thin in audits. Do not pad.                      |
| Product strip  | A `[products: ...]` block placed right after the section it supports. Up to 3 real, published items. |
| FAQ            | A closing FAQ as consecutive accordions, written from real reader questions.                         |
| Internal links | At least 3 links to related guides, categories, or collections. Use canonical URLs.                  |
| Call to action | One `[button: ...]` near the end, linking to a relevant collection.                                  |
| Images         | Meaningful alt text on every image.                                                                  |

**Post types**

| Type               | Typical blog                        | Needs                                                            |
| ------------------ | ----------------------------------- | ---------------------------------------------------------------- |
| Buying guide       | Electric Scooters or Electric Bikes | Comparison logic, trio of products, FAQ, button                  |
| "Best for X" list  | Same                                | Clear criteria, one product strip per pick group                 |
| Review             | Reviews                             | Specs, pros and cons, who it suits, the reviewed product's strip |
| How-to / explainer | Rider Guides                        | Step-by-step or plain-language explanation, FAQ                  |
| Comparison         | Either                              | Side-by-side sections, a recommendation for each reader type     |

---

## Shortcodes

Shopify's editor has no custom blocks, so writers type a short marker and the site turns it into a real component.

### Accordion

Wrap the content between an opening and a closing marker. The content can be paragraphs, lists, and links.

```html
<p>[accordion: Motor placement: mid-drive or hub?]</p>
<p>Mid-drive motors offer better balance and hill-climbing. Hub motors are simpler and cheaper.</p>
<p>[/accordion]</p>
```

Behavior:

- Accordions that follow each other become **one connected list** with dividers.
- They all start **closed**.
- Each one opens and closes on its own, so several can be open at once.
- Links inside an accordion are shown dark and underlined.
- A paragraph, heading, or other content between two accordions **starts a new list**.
- Every `[accordion: ...]` needs a matching `[/accordion]`.

### Button

```html
<p>[button: /collections/electric-bikes | Shop electric bikes]</p>
```

Format: `[button: link | label]`

- The link must start with `/` or `https://`. Anything else is ignored.

### Products

Shows product cards pulled live from the store. **The number of handles picks the layout:**

| Handles | Layout                                       |
| ------- | -------------------------------------------- |
| 1       | Single: one product, full column width       |
| 2       | Duo: two side by side                        |
| 3       | Trio: three in a row (two per row on phones) |

Formats:

```html
<p>[products: lectric-xp-black]</p>
<p>[products: lectric-xp-step-thru-white, lectric-xp-lite-sandstorm]</p>
<p>[products: Shop our best-selling commuter | lectric-xp-black]</p>
<p>
  [products: Shop our standout picks | /collections/electric-bikes | handle-1, handle-2, handle-3]
</p>
```

| Parts (separated by `\|`) | Meaning                                                      |
| ------------------------- | ------------------------------------------------------------ |
| Handles only              | No header row                                                |
| Title, then handles       | Header row with the title                                    |
| Title, link, then handles | Header row with the title and a "Shop Now" link on the right |

Notes:

- The **last part is always the handles**, separated by commas.
- Use the product handle, which is the last part of a product URL (`/products/{handle}`).
- A maximum of **3 products** is shown. Extra handles are ignored.
- Handles are not case-sensitive, and a repeated handle is shown once.
- A handle that does not exist is skipped. If none exist, nothing is shown.
- Do not use a `|` or a comma inside a title.

### Shortcode rules at a glance

- One shortcode per paragraph, alone: `<p>[...]</p>`.
- Open and close every accordion.
- Link and handle values must be real (`/` or `https://` for links, existing published products for handles).
- A body edited by a script can break these silently. See [Bulk edits and publishing](#bulk-edits-and-publishing).

---

## Automatic features

These need no markers.

- **Contents sidebar.** Built from the article's **Heading 2** sections. It appears on wide screens when there are two or more H2s. Each entry scrolls to its section.
- **Category page "Featured".** The first five articles in the category, numbered 01 to 05.
- **Category page "The latest".** The newest article is the large hero, and the rest fill a two-column grid.
- **Load More.** Grids show 6 articles at a time, with "Viewing 1 - N of N articles" under them.
- **Byline.** Author and date come from the Shopify post. If the post has an author profile, the name links to the author page.
- **Author card.** Posts with an author profile show a card under the body (see Authors).
- **Article header.** Category, uppercase title, byline, and tag chips, all left-aligned. Each chip links to its tag page. The hero image fills the main column, the body text lines up with its left and right edges, and the Contents box starts level with the top of the image.
- **Back to top.** A button appears at the bottom right once the reader is 40% of the way down the page.
- **Reading progress.** A thin line along the bottom edge of the sticky header fills as the reader moves through the article. It slides away and returns with the header, and it only shows on article pages.
- **You may like.** Up to three related articles in the sidebar, each showing category, title, and author. Related means shared tags first, then the same blog, then newest. Articles without a featured image show a gray placeholder, so add an image to every post.

The storefront builds the table of contents, related posts, social sharing, and tag chips by itself. The leftover theme metafields for these (see [Article data](#article-data-metafields)) do nothing.

---

## Categories and tags

**Category = Shopify blog.** The row at the top of every blog page lists your blogs. Put an article in the right blog to give it the right category.

### Target blog structure

The blogs should describe micro-mobility, not generic "Articles" or "Cycling".

| Blog (category)        | What belongs in it                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Electric Scooters      | Buying guides, "best for X" lists, folding, budget, premium, off-road                   |
| Electric Bikes         | Bike guides, mountain bikes, e-bike classes, e-bike vs scooter                          |
| Rider Guides           | Batteries, brakes, helmets, laws, safety, range, lifespan, troubleshooting, maintenance |
| Reviews                | Single-product reviews                                                                  |
| E-Skateboards & Boards | Add when the first post in this area is ready                                           |

Notes:

- The legacy blogs (`Articles`, `cycling`, `Athletes`, `Authors`, `Category`) are being replaced. Do not add new posts to them.
- `Authors` and `Category` were used as taxonomy or entity holders, not real blogs. Do not create content there.
- Moving a post between blogs does not change its article URL.
- Avoid very small blogs. A category page with one article looks empty, so merge or wait.

### Tags

**Tag chips** on a category page are built from the tags on that category's articles (the 12 most common). Each chip links to its tag page.

Good tagging:

- Use readable, consistent names in Title Case, for example `Electric Scooters`. Avoid near-duplicates such as `cycling` and `cycling-1`.
- Tags are case-insensitive for URLs, so `Running` and `running` share a page, but keep one spelling for clean chips.
- Changing only case or spacing keeps the tag URL. Changing the **words** changes it (and breaks any link to the old tag page).
- An article with no tags still works. It just will not appear on any tag page.
- Two or three tags per post is plenty.

Suggested vocabulary:

| Tag                 | Use for                                  |
| ------------------- | ---------------------------------------- |
| `Electric Scooters` | Anything primarily about scooters        |
| `Electric Bikes`    | Anything primarily about e-bikes         |
| `E-Skateboards`     | Boards (when posts exist)                |
| `Buying Guides`     | Guides and "best for X" lists            |
| `Reviews`           | Single-product reviews                   |
| `Safety`            | Helmets, lights, laws, safe riding       |
| `Maintenance`       | Care, repair, troubleshooting, batteries |

Legacy spellings still in use (`electric-scooters`, `electric-scooter-buying-guide`, `electric-mountain-bikes`, `Cycling Guides`) should be normalized to the readable names above. Normalizing case and spacing is cosmetic. Changing the words (for example `electric-scooter-buying-guide` to `Buying Guides`) moves the tag page, so plan for that.

---

## Authors

Author profiles live in Shopify as an **Author** metaobject. Each one gets its own page, and the card on articles and the byline link to it.

**Setup**

- Metaobject definition **Author** with fields `name` (single line text), `role` (single line text), `bio`, and `photo` (File, images only). Storefront API access is on.
- Blog post metafield `custom.author_profile`, type **`mixed_reference`**, whose value is the Author entry. Storefront API access is on. (When writing it through the Admin API, use `mixed_reference`, not `metaobject_reference`.)

**Known issue: `bio` field type.** The storefront was built for a **multi-line text** `bio`, but the live definition currently uses **rich text**. If an author card shows a blank or raw bio, this is the likely cause. Either change the field to multi-line text, or update the author card to render rich text. Check `components/blog/author-card.tsx` and `lib/blog/author-server.ts`.

**Adding an author:**

1. Go to **Content → Metaobjects → Author → Add entry** and fill in name, role, bio, and photo. The entry handle (for example `lannay-dale-tooze`) becomes the URL: `/blogs/author/{handle}`.
2. On each of their posts, pick the entry in the **author_profile** field. The staff **Author** field can stay as it is.

**What readers see:**

- The byline name links to the author page.
- A card (photo, name, role, two lines of bio) appears under the article body.
- The author page shows the profile on the left, topic chips built from their articles, and a "Latest from" grid with Load More.

Notes:

- The photo, role, and bio on the author page come from the author's **newest** post, so set `author_profile` on every post they write.
- A post with no profile falls back to the staff Author name. It has no card and no byline link, but its author page still exists at the name's slug, showing only the name.
- **Set `author_profile` on every real post before publishing it.** At the last audit, only 17 of 59 posts had it, and nearly every real scooter guide was missing it.
- At the last audit, one Author entry existed (`lannay-dale-tooze`, Content Writer). Add an entry for each additional writer before assigning posts to them.

---

## Article data (metafields)

### Used by the storefront

| Field                    | Type                     | Purpose                              |
| ------------------------ | ------------------------ | ------------------------------------ |
| `custom.author_profile`  | `mixed_reference`        | Points to an Author metaobject entry |
| `global.title_tag`       | `single_line_text_field` | SEO title                            |
| `global.description_tag` | `single_line_text_field` | SEO description                      |

Some older posts store the SEO fields with the legacy `string` type. Rewrite them as `single_line_text_field` so every post is consistent.

### Defined but unused (theme leftovers)

These article metafield definitions came from a Shopify theme's blog template. The headless storefront builds the matching features itself, so they have no effect:

- `custom.content_blocks`, `custom.show_toc`, `custom.show_summary`, `custom.show_social_share`, `custom.show_author_section`
- `custom.related_blog_posts`, `custom.related_products`, `custom.featured_articles`, `custom.latest_articles`, `custom.latest_blogs`, `custom.popular_articles`
- `custom.ai_summarizer`, `custom.article_tags`, `custom.menu_item`, `theme.article-tags`

Do not rely on them. Before deleting any definition, confirm the code does not read it:

```powershell
git grep -n -E "custom\.(show_|related_|featured_|latest_|popular_|content_blocks|ai_summarizer|article_tags|menu_item)|article-tags" -- app components lib
```

Block-style metaobjects (`accordion_item`, `accordion_block`, `rich_text_block`, `product_row_block`) are also theme data. Blog posts use shortcodes instead.

### Possible future fields

There is no article field for vehicle type (scooter, e-bike, e-skateboard). Blog and tags cover this today. If posts need structured data later (reviewed product, rating, specs, "last verified" date), add a purpose-built metafield and read it in the article page rather than reusing a theme leftover.

---

## SEO fields

| Field           | Where                               | Guidance                                                                      |
| --------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| SEO title       | `global.title_tag` (Search listing) | Lead with the main topic. Aim for about 50 to 60 characters.                  |
| SEO description | `global.description_tag`            | A clear promise of what the reader gets. Aim for about 120 to 155 characters. |
| Summary         | Article summary                     | One or two plain sentences.                                                   |
| Image alt text  | Each image                          | Describe the image. Do not stuff keywords.                                    |
| Featured image  | Article image                       | Landscape, relevant, with alt text.                                           |

Notes:

- At the last audit, only a handful of posts had SEO titles and descriptions. Fill them in for every real post.
- Whether the page falls back to the post title and summary when SEO fields are empty is not confirmed. Check the served `<title>` and description on the live page.
- Keyword targeting, Semrush workflow, and audits are in `docs/storefronts/blog/seo.md`. The draft batch plan is in `docs/storefronts/blog/content-plan.md`.
- Only real, finished posts should be live and indexable. Demo posts and stubs must be Draft.

---

## Pre-publish checklist

Run through this before setting any post live.

**Content**

- [ ] The post fits the [editorial scope](#editorial-scope) and answers one clear question
- [ ] 1,000+ words for a guide, with no padding
- [ ] Facts that change (laws, rebates, specs, prices) are verified and dated
- [ ] Original writing, no copied text

**Structure**

- [ ] No H1 in the body
- [ ] Two or more Heading 2 sections
- [ ] At least one product strip with real, published handles
- [ ] FAQ accordions, each with a closing `[/accordion]`
- [ ] A button with a link starting `/` or `https://`
- [ ] At least three internal links, all canonical URLs
- [ ] Every shortcode is alone in its own `<p>`

**Fields**

- [ ] Featured image set, with alt text
- [ ] Correct blog (category)
- [ ] Two or three tags from the shared vocabulary
- [ ] `author_profile` set
- [ ] Summary, SEO title, and SEO description filled in

**Check**

- [ ] Preview locally (`pnpm dev`, restart if cached) and look at the article, its category page, and its tag page
- [ ] After publishing, load the live page and confirm the Contents sidebar, products, accordions, author card, and "You may like" all render

---

## Full example

```html
<p>Short intro paragraph.</p>

<h2>1. First section</h2>
<p>Some text.</p>

<p>[accordion: First question?]</p>
<p>First answer.</p>
<p>[/accordion]</p>

<p>[accordion: Second question?]</p>
<p>Second answer, with a <a href="/collections/electric-bikes">link</a>.</p>
<p>[/accordion]</p>

<p>[products: Shop electric bikes | /collections/electric-bikes | lectric-xp-black]</p>

<h2>2. Second section</h2>
<p>More text.</p>

<p>
  [products: Shop our standout picks | /collections/electric-bikes | handle-1, handle-2, handle-3]
</p>

<p>[button: /collections/electric-bikes | Shop electric bikes]</p>
```

---

## Bulk edits and publishing

Bulk work (tags, authors, SEO fields, publish status, moving posts between blogs, pulling and pushing article bodies) is done with the **Terminal CMS** scripts. See `docs/apps/terminal-cms/terminal-cms.md` for the full runbook. The essentials:

- **Preview before applying.** Every write job shows old and new values first and writes nothing until you confirm.
- **Snapshot first.** Save the current values so a change can be undone.
- **Match by ID**, check `userErrors`, then read the data again to verify.
- **Do not send `body`** unless the job requires it. Tags, author, summary, and SEO fields can change without touching the body.
- **Protect shortcodes.** A script that edits `body` can break shortcodes with no error from Shopify. Compare shortcodes before and after, and do not apply a change where either check below is `False`:

```powershell
function Test-Shortcodes([string]$body) {
  $open  = [regex]::Matches($body, '\[accordion:').Count
  $close = [regex]::Matches($body, '\[/accordion\]').Count
  $any   = [regex]::Matches($body, '\[(accordion:|/accordion\]|products:|button:)').Count
  $clean = [regex]::Matches($body, '<p>\[(accordion:[^\]]*|/accordion|products:[^\]]*|button:[^\]]*)\]</p>').Count
  [pscustomobject]@{ Balanced = ($open -eq $close); EachInOwnParagraph = ($any -eq $clean) }
}
```

### Publish status

- **Draft** removes a post from the site: its `/blogs/articles/...` URL returns 404, it leaves the sitemap, and it disappears from category, tag, and author pages after the cache refreshes.
- Before any bulk status change, save a snapshot of each post's `isPublished` value so everything can be restored.
- Demo and template posts must stay Draft: `button`, `quote`, `summary`, `heading`, `images-gallery`, `product-sections`, `recipe-header`, `two-column-content`, `table-of-contents`, `social-share`, `related-blog-posts`, `newsletter-form`, `faq-section`, `author-section`, `video`, `blog-post`, `bloggle`, `example-blog-post`, `shopify-hydrogen`, `shopify-headless`.
- Taxonomy and entity stubs (`cycling`, `scootering`, `skateboarding`, `ecombio`, `jordan`, `sky-brown`, `customer-support`, `electric-scooters`, `kick-scooters`, `electric-scooter-parts`, `electric-scooter-accessories`) are not real articles. Do not republish them as posts.

### Content status (as of 2026-10-01)

- All 59 articles were set to **Draft** on 2026-10-01 while the blog is restructured for micro-mobility. Republish posts deliberately, one group at a time, after they pass the [pre-publish checklist](#pre-publish-checklist).
- About 23 to 27 are real posts worth republishing (scooter guides, e-bike guides, rider guides, and two Apollo reviews). The rest are demo posts and stubs.
- Several real posts have empty or very short bodies (for example the commuter, foldable, and "for adults" scooter guides, and the mountain bike guide). Fill them before republishing.
- Before republishing, set `author_profile`, a featured image, and SEO fields on each post.

Update this section after each bulk job.

---

## Troubleshooting

| Problem                                            | Likely cause and fix                                                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A marker shows up as plain text                    | The marker is not alone in its own `<p>`, or has a typo. Open the HTML view and make sure it reads exactly `<p>[accordion: Title]</p>`. Also check that the site code has been deployed. |
| Accordion content shows as text                    | The closing `<p>[/accordion]</p>` is missing.                                                                                                                                            |
| A product strip is missing or shows fewer products | A handle is wrong, or the product is unpublished. Check each handle against its `/products/...` URL.                                                                                     |
| A button is missing                                | Its link does not start with `/` or `https://`.                                                                                                                                          |
| Contents sidebar is missing                        | The article needs two or more Heading 2 sections, and the screen must be wide.                                                                                                           |
| Author card is missing                             | The post has no **author_profile** picked, or Storefront API access is off on the Author definition or the metafield. Also check that `photo` is a File field.                           |
| Author card bio is blank or raw                    | `bio` is a rich text field, but the card expects plain multi-line text. See [Authors](#authors).                                                                                         |
| Tag chips are missing                              | The category's articles have no tags. Add tags in Shopify.                                                                                                                               |
| A tag page 404s after a rename                     | The tag words changed, so the handle changed. Update links to the old tag page.                                                                                                          |
| Progress line is missing                           | Check that `<html>` has `data-reading` on the article page. If not, `[data-article-body]` is missing from `article-page.tsx`.                                                            |
| "You may like" shows gray boxes                    | Those articles have no featured image. Add one in Shopify.                                                                                                                               |
| "You may like" shows the wrong author              | The post has no **author_profile**, so it falls back to the staff Author field.                                                                                                          |
| An article page 404s                               | The post is a Draft, or its handle changed. Check publish status first.                                                                                                                  |
| A category page is empty                           | Every post in that blog is a Draft, or the blog has no posts.                                                                                                                            |
| Changes do not appear locally                      | Content is cached. Restart `pnpm dev`. In production, the cache refreshes from Shopify's webhooks.                                                                                       |
| Old version still showing after saving             | Wait a minute and reload. If it persists, check the deployment status in Vercel.                                                                                                         |

---

## For developers

### Files

| File                                              | Purpose                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `app/blogs/category/[categoryHandle]/page.tsx`    | Category page: title, tag chips, hero, grid, Featured list                                             |
| `app/blogs/author/[authorHandle]/page.tsx`        | Author page: profile, topic chips, article grid                                                        |
| `app/blogs/tag/[tagHandle]/page.tsx`              | Tag page                                                                                               |
| `app/blogs/articles/[articleHandle]/page.tsx`     | Article route                                                                                          |
| `app/blogs/[blogHandle]/page.tsx`                 | Redirect to the category page                                                                          |
| `app/blogs/[blogHandle]/[articleHandle]/page.tsx` | Redirect to the article page                                                                           |
| `components/blog/article-page.tsx`                | Article layout: header, tag chips, hero, body, Contents sidebar                                        |
| `components/blog/article-body.tsx`                | Renders parsed body segments (HTML, accordions, buttons, products)                                     |
| `components/blog/product-strip.tsx`               | Single, duo, and trio product layouts                                                                  |
| `components/blog/author-card.tsx`                 | Author card shown under the article body                                                               |
| `components/blog/article-tile.tsx`                | Article tile for grids and "You may like" (optional `showAuthor` shows the author instead of the date) |
| `components/blog/back-to-top.tsx`                 | Client button. Appears after `SHOW_AT` (0.4) of the page is scrolled.                                  |
| `components/blog/reading-progress.tsx`            | Writes `--reading-progress` (0 to 1) and `data-reading` on `<html>`. Renders nothing itself.           |
| `components/blog/related-articles.tsx`            | "You may like" list. Scores by shared tags, then same blog, then date.                                 |
| `components/nav/index.tsx`                        | Also renders the progress line inside the sticky `<nav>`, so it hides and shows with the header.       |
| `components/blog/load-more-grid.tsx`              | Client-side "Load More" grid                                                                           |
| `components/blog/tag-chips.tsx`                   | Tag chip row                                                                                           |
| `components/blog/blog-sub-nav.tsx`                | Category row at the top of blog pages                                                                  |
| `lib/blog/shortcodes.ts`                          | Shortcode parser and heading-id generator                                                              |
| `lib/blog/author-server.ts`                       | Author queries: groups articles by profile handle, loads the profile                                   |
| `lib/blog/tags.ts`                                | Tag helpers: slug conversion, tag counting                                                             |
| `lib/blog/tag-server.ts`                          | Cross-blog article and tag queries                                                                     |
| `lib/blog/server.ts`                              | Cached blog and article fetchers                                                                       |
| `lib/shopify/operations/blogs/server.ts`          | Shopify Storefront API queries                                                                         |
| `app/sitemap/[shard]/route.ts`                    | Sitemap shards (blogs list `/blogs/category/...`)                                                      |
| `lib/shopify/operations/sitemap/server.ts`        | Article sitemap paths (`/blogs/articles/...`)                                                          |

### Article page extras

- Reading progress is measured on the element marked `data-article-body` in `article-page.tsx`. Keep that attribute on the left column.
- The header line in `components/nav/index.tsx` only shows while `<html>` has `data-reading`. If it never appears, check that attribute and that `--reading-progress` changes while scrolling.
- `article-page.tsx` has a local `tagHandle()` helper that duplicates the slug rule in `lib/blog/tags.ts`. Switch to the shared helper if one is exported.
- "You may like" reads from `getAllArticles()`, so it is limited to the 50-per-blog cap.

### How the body is rendered

1. `parseBody()` splits the article HTML on shortcode paragraphs into typed segments.
2. `addHeadingIds()` adds an `id` to every H2 and H3 and collects them for the Contents list.
3. `ArticleBody` renders each segment. Consecutive accordion segments are grouped into one list.
4. `ProductStrip` is an async server component. It calls `getProduct({ handle })` for each handle and reuses the store's `ProductCard`.

### Adding a new shortcode

1. Add a pattern to `SHORTCODE` and a new variant to `BodySegment` in `lib/blog/shortcodes.ts`, then handle it in `parseBody()`.
2. Add a `case` for it in `components/blog/article-body.tsx`.
3. Document it in this file.

### Limits

- Each blog loads up to **50 articles** (`limit` in `fetchBlog`). Tag chips, tag pages, and "Viewing N of N" counts reflect only those. Before a blog passes 50 posts, confirm that pages beyond the first 50 still render on demand (`generateStaticParams` also loads at most 50 per blog).
- "Load More" reveals already-loaded articles in the browser. It does not fetch more from Shopify.
- Tag and author pages are not in the sitemap yet.
- Product cards in articles use the shared `ProductCard`. They show the image, name, price, and a discount badge when a compare-at price is set, but no ratings or variant text. The strip overrides the card image to 4:3 with `object-contain` so landscape photos are not cropped.
- Author pages group the articles already loaded (up to 50 per blog), and read the profile from the newest one.
- Redirects for moved or merged article URLs belong in the Next.js config. Shopify URL redirects probably do not apply on the headless domain (to be confirmed).

### Deploying

Content changes in Shopify go live on their own once the cache refreshes. Code changes (this system included) need a normal deploy to `main`. Before pushing, run `pnpm oxfmt`, `pnpm lint`, and `pnpm build`, and read the file list before confirming the push.

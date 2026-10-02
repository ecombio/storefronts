import { ArticleBody } from "@/components/blog/article-body";
import { parseBody } from "@/lib/blog/shortcodes";
import type { CollectionAfterItemPage } from "@/lib/collections/types";

export function AfterItemList({ page }: { page: CollectionAfterItemPage }) {
  if (!page.body.trim()) return null;
  const segments = parseBody(page.body);
  return (
    <section aria-label={page.title} className="mt-4 border-t pt-6">
      <div className="w-full [&_article]:max-w-none [&>div]:gap-3 [&_h2]:mt-0 [&_h2]:mb-2 [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:my-2 [&_ul]:my-2 [&_li]:my-0.5">
        <ArticleBody segments={segments} />
      </div>
    </section>
  );
}

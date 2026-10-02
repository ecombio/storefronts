import { ChevronDown } from "lucide-react";

import { getFrequentlyAskedQuestions } from "@/lib/product/server";

// Same shortcode as blog posts: [accordion: Question] answer [/accordion]. Tolerates Shopify wrapping them in <p>.
const ACCORDION =
  /(?:<p>\s*)?\[accordion:\s*([^\]]*?)\s*\](?:\s*<\/p>)?([\s\S]*?)(?:<p>\s*)?\[\/accordion\](?:\s*<\/p>)?/g;

function parseAccordions(html: string) {
  return Array.from(html.matchAll(ACCORDION), (m) => ({
    question: m[1],
    answer: m[2].trim(),
  }));
}

export async function FrequentlyAskedQuestionsSection({ handle }: { handle: string }) {
  const html = await getFrequentlyAskedQuestions({ handle });
  const items = html ? parseAccordions(html) : [];

  return (
    <section data-slot="frequently-asked-questions">
      <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
      <div className="mt-5">
        {items.length > 0 ? (
          <div className="divide-y border-y">
            {items.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div
                  className="prose prose-sm mt-3 max-w-none text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </details>
            ))}
          </div>
        ) : html ? (
          <div
            className="prose prose-sm max-w-none text-foreground/80"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-sm text-foreground/60">
            Frequently asked questions aren't available for this product yet.
          </p>
        )}
      </div>
    </section>
  );
}

// app/sections/CollectionAfterItems.tsx

interface CollectionAfterItemsProps {
  body: string | null | undefined;
}

/**
 * Rich-text block rendered below the entire collection body (filters,
 * tabs, product/article feed), sourced from the collection's
 * `custom.after_item_lists` metafield — a single Page reference.
 * Renders nothing when the collection has no page attached.
 *
 * The Liquid original also handled a "list of pages" variant
 * (`type contains 'list'`), but the metafield definition here is
 * `Type: One`, so that branch doesn't apply — always exactly one
 * page's body, or none.
 */
export function CollectionAfterItems({body}: CollectionAfterItemsProps) {
  if (!body) {
    // TEMPORARY debug fallback — remove once this renders real content.
    // If you see this message, the component IS rendering correctly;
    // the metafield on THIS collection just has no page attached
    // (or the query/build hasn't picked up the field yet).
    return (
      <p style={{padding: '2rem', color: '#999', fontStyle: 'italic'}}>
        [debug] after_item_lists: no page body received
      </p>
    );
  }

  return (
    <div className="after-items rte" dangerouslySetInnerHTML={{__html: body}} />
  );
}
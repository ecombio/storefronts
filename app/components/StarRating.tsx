import type {ProductFragment} from 'storefrontapi.generated';
import type {YotpoReviewSummary} from '~/lib/yotpo.server';

const YOTPO_STAR_RATING_INSTANCE_ID = '1332841';

export function StarRating({
  product,
  reviewSummary,
}: {
  product: ProductFragment;
  reviewSummary: YotpoReviewSummary | null;
}) {
  return (
    <div
      className="yotpo-widget-instance"
      data-yotpo-instance-id={YOTPO_STAR_RATING_INSTANCE_ID}
      data-yotpo-product-id={product.id.split('/').pop()}
    >
      {/*
        Server-rendered fallback: shown immediately on first paint using
        data fetched in the route loader, so there's no flicker/pop-in
        while Yotpo's client-side script loads and takes over. Once
        Yotpo mounts, it replaces this content with its interactive
        widget (matching product id, so no key mismatch).
      */}
      {reviewSummary && reviewSummary.totalReviews > 0 && (
        <span
          aria-hidden="true"
          style={{fontSize: '0.875rem', color: 'inherit'}}
        >
          {'★'.repeat(Math.round(reviewSummary.averageScore))}
          {'☆'.repeat(5 - Math.round(reviewSummary.averageScore))}{' '}
          ({reviewSummary.totalReviews})
        </span>
      )}
    </div>
  );
}


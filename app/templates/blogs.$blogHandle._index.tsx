import {Link} from 'react-router';
import blogCategoryStyles from '~/assets/blog-category.css?url';

export function links() {
  return [{rel: 'stylesheet', href: blogCategoryStyles}];
}

export function meta() {
  return [{title: 'Hydrogen | Category'}];
}

// STATIC PLACEHOLDER DATA — replace with real Shopify article data later.
// Each post is shaped close to what the Storefront API's Article object
// returns, so swapping this out for a real loader() later is a drop-in.
const PLACEHOLDER_POSTS = [
  {
    handle: 'best-electric-bikes-guide',
    title: 'Top Electric Bikes for Every Rider',
    excerpt:
      'From commuter to cargo to trail, here is how to actually pick the right e-bike for how you ride.',
    image: 'https://placehold.co/1200x700/1a1a1a/ffffff?text=Featured+Post',
    tag: 'Buying Guides',
    publishedAt: '2026-05-19',
  },
  {
    handle: 'ecombio',
    title: 'The Ecombio Story',
    excerpt: 'Why we started, what we stand for, and where we are headed.',
    image: 'https://placehold.co/800x600/e5e5e5/1a1a1a?text=Post+2',
    tag: 'Brand',
    publishedAt: '2026-08-22',
  },
  {
    handle: 'placeholder-post-3',
    title: 'Placeholder Post Title Three',
    excerpt: 'Short placeholder excerpt text for the third card in the grid.',
    image: 'https://placehold.co/800x600/e5e5e5/1a1a1a?text=Post+3',
    tag: 'Guides',
    publishedAt: '2026-08-01',
  },
  {
    handle: 'placeholder-post-4',
    title: 'Placeholder Post Title Four',
    excerpt: 'Short placeholder excerpt text for the fourth card in the grid.',
    image: 'https://placehold.co/800x600/e5e5e5/1a1a1a?text=Post+4',
    tag: 'Guides',
    publishedAt: '2026-07-15',
  },
  {
    handle: 'placeholder-post-5',
    title: 'Placeholder Post Title Five',
    excerpt: 'Short placeholder excerpt text for the fifth card in the grid.',
    image: 'https://placehold.co/800x600/e5e5e5/1a1a1a?text=Post+5',
    tag: 'Tips',
    publishedAt: '2026-06-30',
  },
  {
    handle: 'placeholder-post-6',
    title: 'Placeholder Post Title Six',
    excerpt: 'Short placeholder excerpt text for the sixth card in the grid.',
    image: 'https://placehold.co/800x600/e5e5e5/1a1a1a?text=Post+6',
    tag: 'Tips',
    publishedAt: '2026-06-10',
  },
];

const CATEGORY_TITLE = 'Category';
const CATEGORY_TAGS = ['All', 'Buying Guides', 'Brand', 'Guides', 'Tips'];

export default function BlogCategory() {
  const [featured, ...rest] = PLACEHOLDER_POSTS;

  return (
    <div className="blog-category">
      {/* Hero */}
      <section className="blog-category__hero">
        <h1>{CATEGORY_TITLE}</h1>
        <p>Guides, stories, and updates — placeholder subtitle text.</p>
      </section>

      {/* Category pills (static for now, non-functional) */}
      <nav className="blog-category__tags" aria-label="Filter by tag">
        {CATEGORY_TAGS.map((tag) => (
          <span key={tag} className="blog-category__tag">
            {tag}
          </span>
        ))}
      </nav>

      {/* Featured post */}
      <Link
        to={`/blogs/category/${featured.handle}`}
        className="featured-post"
      >
        <div className="featured-post__image">
          <img src={featured.image} alt={featured.title} />
        </div>
        <div className="featured-post__body">
          <span className="post-tag">{featured.tag}</span>
          <h2>{featured.title}</h2>
          <p>{featured.excerpt}</p>
          <time dateTime={featured.publishedAt}>
            {formatDate(featured.publishedAt)}
          </time>
        </div>
      </Link>

      {/* Grid */}
      <div className="blog-category__grid">
        {rest.map((post) => (
          <Link
            key={post.handle}
            to={`/blogs/category/${post.handle}`}
            className="post-card"
          >
            <div className="post-card__image">
              <img src={post.image} alt={post.title} />
            </div>
            <div className="post-card__body">
              <span className="post-tag">{post.tag}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <time dateTime={post.publishedAt}>
                {formatDate(post.publishedAt)}
              </time>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString));
}

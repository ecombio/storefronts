import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {HeaderQuery} from 'storefrontapi.generated';

/**
 * Query for the "footer" menu (Shopify Admin -> Content -> Menus ->
 * "Footer menu", handle: footer) PLUS a second, separate "Store Policy"
 * menu (Shopify Admin -> Content -> Menus -> "Store Policy", handle:
 * policies). The second menu renders as a flat legal-links row at the
 * very bottom of the footer — fully editable from Admin (reorder, rename,
 * add/remove items) without touching this component.
 *
 * Use it in your loader, e.g. app/root.tsx:
 *
 *   const footer = context.storefront
 *     .query(FOOTER_QUERY, {
 *       cache: context.storefront.CacheLong(),
 *       variables: {footerMenuHandle: 'footer', policiesMenuHandle: 'policies'},
 *     })
 *     .catch(() => null);
 *
 * Then pass that promise as the `footer` prop to <Footer footer={footer} .../>.
 */
export const FOOTER_QUERY = `#graphql
  fragment FlatMenuItem on MenuItem {
    id
    title
    url
  }
  query FooterMenu(
    $country: CountryCode
    $footerMenuHandle: String!
    $policiesMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    menu(handle: $footerMenuHandle) {
      id
      items {
        id
        title
        url
        items {
          id
          title
          url
        }
      }
    }
    policiesMenu: menu(handle: $policiesMenuHandle) {
      id
      items {
        ...FlatMenuItem
      }
    }
  }
` as const;

interface FooterMenuItem {
  id: string;
  title: string;
  url?: string | null;
}

interface FooterColumn {
  id: string;
  title: string;
  url?: string | null;
  items: FooterMenuItem[];
}

export interface FooterMenuData {
  id: string;
  items: FooterColumn[];
}

interface FlatMenuData {
  id: string;
  items: FooterMenuItem[];
}

export interface FooterQueryData {
  menu: FooterMenuData | null;
  policiesMenu: FlatMenuData | null;
}

interface FooterProps {
  footer: Promise<FooterQueryData | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

// Inline styles — no separate CSS file, nothing extra to import.
const styles = {
  footer: {
    borderTop: '1px solid #e5e5e5',
    padding: '40px 24px 24px',
  } as React.CSSProperties,
  menu: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '24px',
    maxWidth: '1184px',
    margin: '0 auto',
  } as React.CSSProperties,
  column: {
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  heading: {
    fontSize: '0.875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.01em',
    margin: '0 0 12px',
  } as React.CSSProperties,
  link: {
    padding: '4px 0',
    fontSize: '0.875rem',
    color: '#555',
    textDecoration: 'none',
  } as React.CSSProperties,
  bottom: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    maxWidth: '1184px',
    margin: '32px auto 0',
    paddingTop: '16px',
    borderTop: '1px solid #e5e5e5',
  } as React.CSSProperties,
  bottomText: {
    margin: 0,
    fontSize: '0.8125rem',
    color: '#777',
  } as React.CSSProperties,
  legalLinks: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  } as React.CSSProperties,
  legalLink: {
    fontSize: '0.8125rem',
    color: '#555',
    textDecoration: 'none',
  } as React.CSSProperties,
};

function resolveUrl(
  url: string,
  primaryDomainUrl: string | undefined,
  publicStoreDomain: string,
): {url: string; isExternal: boolean} {
  const isInternal =
    url.includes('myshopify.com') ||
    url.includes(publicStoreDomain) ||
    (primaryDomainUrl && url.includes(primaryDomainUrl));
  const resolved = isInternal ? new URL(url).pathname : url;
  return {url: resolved, isExternal: !resolved.startsWith('/')};
}

export function Footer({footer: footerPromise, header, publicStoreDomain}: FooterProps) {
  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer style={styles.footer}>
            {footer?.menu?.items && footer.menu.items.length > 0 && (
              <FooterMenu
                columns={footer.menu.items}
                primaryDomainUrl={header.shop.primaryDomain?.url}
                publicStoreDomain={publicStoreDomain}
              />
            )}
            <div style={styles.bottom}>
              <p style={styles.bottomText}>© {new Date().getFullYear()} {header.shop.name}. All rights reserved.</p>
              {footer?.policiesMenu?.items && footer.policiesMenu.items.length > 0 && (
                <LegalLinks
                  items={footer.policiesMenu.items}
                  primaryDomainUrl={header.shop.primaryDomain?.url}
                  publicStoreDomain={publicStoreDomain}
                />
              )}
            </div>
          </footer>
        )}
      </Await>
    </Suspense>
  );
}

function LegalLinks({
  items,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  items: FooterMenuItem[];
  primaryDomainUrl?: string;
  publicStoreDomain: string;
}) {
  return (
    <nav style={styles.legalLinks} aria-label="Legal">
      {items.map((item) => {
        if (!item.url) return null;
        const {url, isExternal} = resolveUrl(item.url, primaryDomainUrl, publicStoreDomain);

        return isExternal ? (
          <a key={item.id} style={styles.legalLink} href={url} rel="noopener noreferrer" target="_blank">
            {item.title}
          </a>
        ) : (
          <NavLink key={item.id} style={styles.legalLink} end prefetch="intent" to={url}>
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

function FooterMenu({
  columns,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  columns: FooterColumn[];
  primaryDomainUrl?: string;
  publicStoreDomain: string;
}) {
  return (
    <nav style={styles.menu} role="navigation">
      {columns.map((column) => (
        <div style={styles.column} key={column.id}>
          <h3 style={styles.heading}>{column.title}</h3>
          {column.items.map((item) => (
            <FooterLink
              key={item.id}
              item={item}
              primaryDomainUrl={primaryDomainUrl}
              publicStoreDomain={publicStoreDomain}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

function FooterLink({
  item,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  item: FooterMenuItem;
  primaryDomainUrl?: string;
  publicStoreDomain: string;
}) {
  if (!item.url) return null;

  const {url, isExternal} = resolveUrl(item.url, primaryDomainUrl, publicStoreDomain);

  return isExternal ? (
    <a style={styles.link} href={url} rel="noopener noreferrer" target="_blank">
      {item.title}
    </a>
  ) : (
    <NavLink style={styles.link} end prefetch="intent" to={url}>
      {item.title}
    </NavLink>
  );
}
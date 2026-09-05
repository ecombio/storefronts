/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

export type MenuCollectionImagesQueryVariables = StorefrontAPI.Exact<{
  ids:
    | Array<StorefrontAPI.Scalars['ID']['input']>
    | StorefrontAPI.Scalars['ID']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type MenuCollectionImagesQuery = {
  nodes: Array<
    StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Collection, 'id'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText'>
        >;
      }
    >
  >;
};

export type ArticleItemFragment = Pick<
  StorefrontAPI.Article,
  'id' | 'handle' | 'title' | 'excerpt' | 'publishedAt'
> & {
  blog: Pick<StorefrontAPI.Blog, 'handle'>;
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
  readingTime?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
};

export type CollectionCardFragment = Pick<
  StorefrontAPI.Collection,
  'id' | 'handle' | 'title'
> & {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
};

export type ProductCardFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'handle' | 'title' | 'vendor'
> & {
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  compareAtPriceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.ProductVariant, 'id' | 'availableForSale'>
  >;
  etaText?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  sponsored?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  reviewsRating?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  reviewsCount?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
};

export type ArticleQueryVariables = StorefrontAPI.Exact<{
  articleHandle: StorefrontAPI.Scalars['String']['input'];
  blogHandle: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type ArticleQuery = {
  blog?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Blog, 'handle'> & {
      articleByHandle?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.Article,
          'id' | 'handle' | 'title' | 'contentHtml' | 'publishedAt'
        > & {
          author?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.ArticleAuthor, 'name'>
          >;
          image?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'altText' | 'url' | 'width' | 'height'
            >
          >;
          seo?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Seo, 'description' | 'title'>
          >;
          blog: Pick<StorefrontAPI.Blog, 'handle'>;
          layoutVariant?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          authorProfile?: StorefrontAPI.Maybe<{
            reference?: StorefrontAPI.Maybe<{
              name?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
              bio?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
              avatar?: StorefrontAPI.Maybe<{
                reference?: StorefrontAPI.Maybe<{
                  image?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Image, 'url' | 'altText'>
                  >;
                }>;
              }>;
            }>;
          }>;
          showAuthorSection?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          showToc?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
          relatedBlogPosts?: StorefrontAPI.Maybe<{
            references?: StorefrontAPI.Maybe<{
              nodes: Array<
                Pick<
                  StorefrontAPI.Article,
                  'id' | 'handle' | 'title' | 'publishedAt'
                > & {
                  image?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                  blog: Pick<StorefrontAPI.Blog, 'handle'>;
                }
              >;
            }>;
          }>;
          showSocialShare?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          relatedProducts?: StorefrontAPI.Maybe<{
            references?: StorefrontAPI.Maybe<{
              nodes: Array<Pick<StorefrontAPI.Product, 'id'>>;
            }>;
          }>;
          latestBlogs?: StorefrontAPI.Maybe<{
            references?: StorefrontAPI.Maybe<{
              nodes: Array<
                Pick<
                  StorefrontAPI.Article,
                  'id' | 'title' | 'handle' | 'publishedAt'
                > & {
                  image?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                  blog: Pick<StorefrontAPI.Blog, 'handle'>;
                }
              >;
            }>;
          }>;
        }
      >;
    }
  >;
};

export type ShoppableProductsQueryVariables = StorefrontAPI.Exact<{
  ids:
    | Array<StorefrontAPI.Scalars['ID']['input']>
    | StorefrontAPI.Scalars['ID']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type ShoppableProductsQuery = {
  nodes: Array<
    StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Product, 'id' | 'handle' | 'title' | 'vendor'> & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.ProductVariant, 'id' | 'availableForSale'>
        >;
        etaText?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        sponsored?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        reviewsRating?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        reviewsCount?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
      }
    >
  >;
};

export type MoneyFragment = Pick<
  StorefrontAPI.MoneyV2,
  'currencyCode' | 'amount'
>;

export type CartLineFragment = Pick<
  StorefrontAPI.CartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    | 'id'
    | 'availableForSale'
    | 'quantityAvailable'
    | 'requiresShipping'
    | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id' | 'vendor'>;
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
  };
  parentRelationship?: StorefrontAPI.Maybe<{
    parent: Pick<StorefrontAPI.CartLine, 'id'>;
  }>;
};

export type CartLineComponentFragment = Pick<
  StorefrontAPI.ComponentizableCartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    | 'id'
    | 'availableForSale'
    | 'quantityAvailable'
    | 'requiresShipping'
    | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id' | 'vendor'>;
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
  };
  lineComponents: Array<
    Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
      attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
      cost: {
        totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
        amountPerQuantity: Pick<
          StorefrontAPI.MoneyV2,
          'currencyCode' | 'amount'
        >;
        compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
      };
      merchandise: Pick<
        StorefrontAPI.ProductVariant,
        | 'id'
        | 'availableForSale'
        | 'quantityAvailable'
        | 'requiresShipping'
        | 'title'
      > & {
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        product: Pick<
          StorefrontAPI.Product,
          'handle' | 'title' | 'id' | 'vendor'
        >;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
      };
      parentRelationship?: StorefrontAPI.Maybe<{
        parent: Pick<StorefrontAPI.CartLine, 'id'>;
      }>;
    }
  >;
};

export type CartApiQueryFragment = Pick<
  StorefrontAPI.Cart,
  'updatedAt' | 'id' | 'checkoutUrl' | 'totalQuantity' | 'note'
> & {
  appliedGiftCards: Array<
    Pick<StorefrontAPI.AppliedGiftCard, 'id' | 'lastCharacters'> & {
      amountUsed: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    }
  >;
  buyerIdentity: Pick<
    StorefrontAPI.CartBuyerIdentity,
    'countryCode' | 'email' | 'phone'
  > & {
    customer?: StorefrontAPI.Maybe<
      Pick<
        StorefrontAPI.Customer,
        'id' | 'email' | 'firstName' | 'lastName' | 'displayName'
      >
    >;
  };
  lines: {
    nodes: Array<
      | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
          cost: {
            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            amountPerQuantity: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
          };
          merchandise: Pick<
            StorefrontAPI.ProductVariant,
            | 'id'
            | 'availableForSale'
            | 'quantityAvailable'
            | 'requiresShipping'
            | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            product: Pick<
              StorefrontAPI.Product,
              'handle' | 'title' | 'id' | 'vendor'
            >;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
          };
          parentRelationship?: StorefrontAPI.Maybe<{
            parent: Pick<StorefrontAPI.CartLine, 'id'>;
          }>;
        })
      | (Pick<StorefrontAPI.ComponentizableCartLine, 'id' | 'quantity'> & {
          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
          cost: {
            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            amountPerQuantity: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
          };
          merchandise: Pick<
            StorefrontAPI.ProductVariant,
            | 'id'
            | 'availableForSale'
            | 'quantityAvailable'
            | 'requiresShipping'
            | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            product: Pick<
              StorefrontAPI.Product,
              'handle' | 'title' | 'id' | 'vendor'
            >;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
          };
          lineComponents: Array<
            Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
              attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
              cost: {
                totalAmount: Pick<
                  StorefrontAPI.MoneyV2,
                  'currencyCode' | 'amount'
                >;
                amountPerQuantity: Pick<
                  StorefrontAPI.MoneyV2,
                  'currencyCode' | 'amount'
                >;
                compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
                >;
              };
              merchandise: Pick<
                StorefrontAPI.ProductVariant,
                | 'id'
                | 'availableForSale'
                | 'quantityAvailable'
                | 'requiresShipping'
                | 'title'
              > & {
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'id' | 'url' | 'altText' | 'width' | 'height'
                  >
                >;
                product: Pick<
                  StorefrontAPI.Product,
                  'handle' | 'title' | 'id' | 'vendor'
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
              };
              parentRelationship?: StorefrontAPI.Maybe<{
                parent: Pick<StorefrontAPI.CartLine, 'id'>;
              }>;
            }
          >;
        })
    >;
  };
  cost: {
    subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalDutyAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    totalTaxAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  discountCodes: Array<
    Pick<StorefrontAPI.CartDiscountCode, 'code' | 'applicable'>
  >;
};

export type MenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ChildMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ParentMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    >
  >;
};

export type MenuFragment = Pick<StorefrontAPI.Menu, 'id'> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    > & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        >
      >;
    }
  >;
};

export type ShopFragment = Pick<
  StorefrontAPI.Shop,
  'id' | 'name' | 'description'
> & {
  primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
  brand?: StorefrontAPI.Maybe<{
    logo?: StorefrontAPI.Maybe<{
      image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
    }>;
  }>;
};

export type HeaderQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  headerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type HeaderQuery = {
  shop: Pick<StorefrontAPI.Shop, 'id' | 'name' | 'description'> & {
    primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
    brand?: StorefrontAPI.Maybe<{
      logo?: StorefrontAPI.Maybe<{
        image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
      }>;
    }>;
  };
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type FooterQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  footerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type FooterQuery = {
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type ProductRecommendationsQueryVariables = StorefrontAPI.Exact<{
  productId: StorefrontAPI.Scalars['ID']['input'];
  intent?: StorefrontAPI.InputMaybe<StorefrontAPI.ProductRecommendationIntent>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type ProductRecommendationsQuery = {
  productRecommendations?: StorefrontAPI.Maybe<
    Array<
      Pick<StorefrontAPI.Product, 'id' | 'handle' | 'title' | 'vendor'> & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.ProductVariant, 'id' | 'availableForSale'>
        >;
        etaText?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        sponsored?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        reviewsRating?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        reviewsCount?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
      }
    >
  >;
};

export type FlatMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'title' | 'url'
>;

export type FooterMenuQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  footerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  policiesMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type FooterMenuQuery = {
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<StorefrontAPI.MenuItem, 'id' | 'title' | 'url'> & {
          items: Array<Pick<StorefrontAPI.MenuItem, 'id' | 'title' | 'url'>>;
        }
      >;
    }
  >;
  policiesMenu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<Pick<StorefrontAPI.MenuItem, 'id' | 'title' | 'url'>>;
    }
  >;
};

export type ShopByCategoryQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type ShopByCategoryQuery = {
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'handle' | 'title'> & {
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
      }
    >;
  };
};

export type RecommendedProductsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type RecommendedProductsQuery = {
  products: {
    nodes: Array<
      Pick<StorefrontAPI.Product, 'id' | 'handle' | 'title' | 'vendor'> & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.ProductVariant, 'id' | 'availableForSale'>
        >;
        etaText?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        sponsored?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        reviewsRating?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
        reviewsCount?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metafield, 'value'>
        >;
      }
    >;
  };
};

export type NewsletterCustomerCreateMutationVariables = StorefrontAPI.Exact<{
  input: StorefrontAPI.CustomerCreateInput;
}>;

export type NewsletterCustomerCreateMutation = {
  customerCreate?: StorefrontAPI.Maybe<{
    customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id'>>;
    customerUserErrors: Array<
      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
    >;
  }>;
};

export type PredictiveSearchInstantQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  limit: StorefrontAPI.Scalars['Int']['input'];
  limitScope: StorefrontAPI.PredictiveSearchLimitScope;
  query: StorefrontAPI.Scalars['String']['input'];
  types?: StorefrontAPI.InputMaybe<
    | Array<StorefrontAPI.PredictiveSearchType>
    | StorefrontAPI.PredictiveSearchType
  >;
}>;

export type PredictiveSearchInstantQuery = {
  predictiveSearch?: StorefrontAPI.Maybe<{
    queries: Array<Pick<StorefrontAPI.SearchQuerySuggestion, 'text'>>;
    products: Array<
      Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'handle' | 'vendor' | 'productType' | 'tags'
      > & {
        selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<{
          image?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText'>
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        }>;
      }
    >;
    collections: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText'>
        >;
      }
    >;
    articles: Array<
      Pick<StorefrontAPI.Article, 'id' | 'title' | 'handle' | 'publishedAt'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText'>
        >;
        blog: Pick<StorefrontAPI.Blog, 'handle'>;
      }
    >;
    pages: Array<Pick<StorefrontAPI.Page, 'id' | 'title' | 'handle'>>;
  }>;
};

export type QuickViewVariantFragment = Pick<
  StorefrontAPI.ProductVariant,
  'availableForSale' | 'id' | 'sku' | 'title'
> & {
  compareAtPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  selectedOptions: Array<Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>>;
};

export type QuickViewProductFragment = Pick<
  StorefrontAPI.Product,
  | 'id'
  | 'title'
  | 'vendor'
  | 'handle'
  | 'encodedVariantExistence'
  | 'encodedVariantAvailability'
> & {
  images: {
    nodes: Array<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
  };
  options: Array<
    Pick<StorefrontAPI.ProductOption, 'name'> & {
      optionValues: Array<
        Pick<StorefrontAPI.ProductOptionValue, 'name'> & {
          firstSelectableVariant?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.ProductVariant,
              'availableForSale' | 'id' | 'sku' | 'title'
            > & {
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'id' | 'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
            }
          >;
          swatch?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.ProductOptionValueSwatch, 'color'> & {
              image?: StorefrontAPI.Maybe<{
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              }>;
            }
          >;
        }
      >;
    }
  >;
  selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.ProductVariant,
      'availableForSale' | 'id' | 'sku' | 'title'
    > & {
      compareAtPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      image?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
      >;
      price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      selectedOptions: Array<
        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
      >;
    }
  >;
  adjacentVariants: Array<
    Pick<
      StorefrontAPI.ProductVariant,
      'availableForSale' | 'id' | 'sku' | 'title'
    > & {
      compareAtPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      image?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
      >;
      price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      selectedOptions: Array<
        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
      >;
    }
  >;
  reviewsRating?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  reviewsCount?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
};

export type QuickViewQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  selectedOptions:
    | Array<StorefrontAPI.SelectedOptionInput>
    | StorefrontAPI.SelectedOptionInput;
}>;

export type QuickViewQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Product,
      | 'id'
      | 'title'
      | 'vendor'
      | 'handle'
      | 'encodedVariantExistence'
      | 'encodedVariantAvailability'
    > & {
      images: {
        nodes: Array<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
      };
      options: Array<
        Pick<StorefrontAPI.ProductOption, 'name'> & {
          optionValues: Array<
            Pick<StorefrontAPI.ProductOptionValue, 'name'> & {
              firstSelectableVariant?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.ProductVariant,
                  'availableForSale' | 'id' | 'sku' | 'title'
                > & {
                  compareAtPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  image?: StorefrontAPI.Maybe<
                    Pick<
                      StorefrontAPI.Image,
                      'id' | 'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  selectedOptions: Array<
                    Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                  >;
                }
              >;
              swatch?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductOptionValueSwatch, 'color'> & {
                  image?: StorefrontAPI.Maybe<{
                    previewImage?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.Image, 'url'>
                    >;
                  }>;
                }
              >;
            }
          >;
        }
      >;
      selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
        }
      >;
      adjacentVariants: Array<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
        }
      >;
      reviewsRating?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      reviewsCount?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
    }
  >;
};

export type BlogTaggedQueryVariables = StorefrontAPI.Exact<{
  blogHandle: StorefrontAPI.Scalars['String']['input'];
  query?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']['input']>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type BlogTaggedQuery = {
  blog?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Blog, 'title' | 'handle'> & {
      articles: {
        pageInfo: Pick<
          StorefrontAPI.PageInfo,
          'hasNextPage' | 'hasPreviousPage' | 'startCursor' | 'endCursor'
        >;
        nodes: Array<Pick<StorefrontAPI.Article, 'id' | 'title' | 'handle'>>;
      };
    }
  >;
};

export type BlogsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type BlogsQuery = {
  blogs: {
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasNextPage' | 'hasPreviousPage' | 'startCursor' | 'endCursor'
    >;
    nodes: Array<
      Pick<StorefrontAPI.Blog, 'id' | 'title' | 'handle'> & {
        seo?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Seo, 'title' | 'description'>
        >;
      }
    >;
  };
};

export type SubCollectionItemFragment = Pick<
  StorefrontAPI.Collection,
  'id' | 'handle' | 'title'
> & {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
};

export type PromoCardFragment = Pick<StorefrontAPI.Metaobject, 'id'> & {
  image?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<{
      image?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
      >;
    }>;
  }>;
  heading?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
  linkText?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
  linkUrl?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
};

export type SponsoredAdsFragment = Pick<StorefrontAPI.Metaobject, 'id'> & {
  heading?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
  subheading?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'value'>
  >;
  position?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
  promoCard?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        image?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            image?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
            >;
          }>;
        }>;
        heading?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        linkText?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        linkUrl?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
      }
    >;
  }>;
  products?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Collection, 'id' | 'handle' | 'title'> & {
        products: {
          nodes: Array<
            Pick<
              StorefrontAPI.Product,
              'id' | 'handle' | 'title' | 'vendor'
            > & {
              featuredImage?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'id' | 'url' | 'altText' | 'width' | 'height'
                >
              >;
              priceRange: {
                minVariantPrice: Pick<
                  StorefrontAPI.MoneyV2,
                  'amount' | 'currencyCode'
                >;
              };
              compareAtPriceRange: {
                minVariantPrice: Pick<
                  StorefrontAPI.MoneyV2,
                  'amount' | 'currencyCode'
                >;
              };
              selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductVariant, 'id' | 'availableForSale'>
              >;
              etaText?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
              sponsored?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
              reviewsRating?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
              reviewsCount?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
            }
          >;
        };
      }
    >;
  }>;
};

export type LayoutVariantValueFragment = {
  variant?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
};

export type PromoBannerFragment = Pick<StorefrontAPI.Metaobject, 'id'> & {
  variant?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<{
      variant?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value'>
      >;
    }>;
  }>;
  heading?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
  subheading?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'value'>
  >;
  image?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<{
      image?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
      >;
    }>;
  }>;
  linkText?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
  linkUrl?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
  backgroundColor?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'value'>
  >;
  textAlignment?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MetaobjectField, 'value'>
  >;
  position?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
};

export type CollectionQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  filters?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.ProductFilter> | StorefrontAPI.ProductFilter
  >;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type CollectionQuery = {
  collection?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Collection,
      'id' | 'handle' | 'title' | 'descriptionHtml'
    > & {
      bannerTextAlignmentMetafield?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      postsMetafield?: StorefrontAPI.Maybe<{
        references?: StorefrontAPI.Maybe<{
          nodes: Array<
            Pick<
              StorefrontAPI.Article,
              'id' | 'handle' | 'title' | 'excerpt' | 'publishedAt'
            > & {
              blog: Pick<StorefrontAPI.Blog, 'handle'>;
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'id' | 'url' | 'altText' | 'width' | 'height'
                >
              >;
              readingTime?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metafield, 'value'>
              >;
            }
          >;
        }>;
      }>;
      subCollectionsMetafield?: StorefrontAPI.Maybe<{
        references?: StorefrontAPI.Maybe<{
          nodes: Array<
            Pick<StorefrontAPI.Collection, 'id' | 'handle' | 'title'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'id' | 'url' | 'altText' | 'width' | 'height'
                >
              >;
            }
          >;
        }>;
      }>;
      afterItemsMetafield?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<
          | {
              __typename:
                | 'Article'
                | 'Collection'
                | 'GenericFile'
                | 'MediaImage'
                | 'Metaobject'
                | 'Model3d'
                | 'Product'
                | 'ProductVariant'
                | 'Video';
            }
          | ({__typename: 'Page'} & Pick<StorefrontAPI.Page, 'id' | 'body'>)
        >;
      }>;
      sponsoredAdsMetafield?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metaobject, 'id'> & {
            heading?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            subheading?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            position?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            promoCard?: StorefrontAPI.Maybe<{
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metaobject, 'id'> & {
                  image?: StorefrontAPI.Maybe<{
                    reference?: StorefrontAPI.Maybe<{
                      image?: StorefrontAPI.Maybe<
                        Pick<
                          StorefrontAPI.Image,
                          'url' | 'altText' | 'width' | 'height'
                        >
                      >;
                    }>;
                  }>;
                  heading?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MetaobjectField, 'value'>
                  >;
                  linkText?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MetaobjectField, 'value'>
                  >;
                  linkUrl?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MetaobjectField, 'value'>
                  >;
                }
              >;
            }>;
            products?: StorefrontAPI.Maybe<{
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Collection, 'id' | 'handle' | 'title'> & {
                  products: {
                    nodes: Array<
                      Pick<
                        StorefrontAPI.Product,
                        'id' | 'handle' | 'title' | 'vendor'
                      > & {
                        featuredImage?: StorefrontAPI.Maybe<
                          Pick<
                            StorefrontAPI.Image,
                            'id' | 'url' | 'altText' | 'width' | 'height'
                          >
                        >;
                        priceRange: {
                          minVariantPrice: Pick<
                            StorefrontAPI.MoneyV2,
                            'amount' | 'currencyCode'
                          >;
                        };
                        compareAtPriceRange: {
                          minVariantPrice: Pick<
                            StorefrontAPI.MoneyV2,
                            'amount' | 'currencyCode'
                          >;
                        };
                        selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
                          Pick<
                            StorefrontAPI.ProductVariant,
                            'id' | 'availableForSale'
                          >
                        >;
                        etaText?: StorefrontAPI.Maybe<
                          Pick<StorefrontAPI.Metafield, 'value'>
                        >;
                        sponsored?: StorefrontAPI.Maybe<
                          Pick<StorefrontAPI.Metafield, 'value'>
                        >;
                        reviewsRating?: StorefrontAPI.Maybe<
                          Pick<StorefrontAPI.Metafield, 'value'>
                        >;
                        reviewsCount?: StorefrontAPI.Maybe<
                          Pick<StorefrontAPI.Metafield, 'value'>
                        >;
                      }
                    >;
                  };
                }
              >;
            }>;
          }
        >;
      }>;
      promoBannerMetafield?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metaobject, 'id'> & {
            variant?: StorefrontAPI.Maybe<{
              reference?: StorefrontAPI.Maybe<{
                variant?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MetaobjectField, 'value'>
                >;
              }>;
            }>;
            heading?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            subheading?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            image?: StorefrontAPI.Maybe<{
              reference?: StorefrontAPI.Maybe<{
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'url' | 'altText' | 'width' | 'height'
                  >
                >;
              }>;
            }>;
            linkText?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            linkUrl?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            backgroundColor?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            textAlignment?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
            position?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
          }
        >;
      }>;
      products: {
        filters: Array<
          Pick<StorefrontAPI.Filter, 'id' | 'label' | 'type'> & {
            values: Array<
              Pick<
                StorefrontAPI.FilterValue,
                'id' | 'label' | 'count' | 'input'
              >
            >;
          }
        >;
        nodes: Array<
          Pick<StorefrontAPI.Product, 'id' | 'handle' | 'title' | 'vendor'> & {
            featuredImage?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            priceRange: {
              minVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            compareAtPriceRange: {
              minVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ProductVariant, 'id' | 'availableForSale'>
            >;
            etaText?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            sponsored?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            reviewsRating?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            reviewsCount?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
          }
        >;
        pageInfo: Pick<
          StorefrontAPI.PageInfo,
          'hasPreviousPage' | 'hasNextPage' | 'endCursor' | 'startCursor'
        >;
      };
    }
  >;
};

export type CollectionFragment = Pick<
  StorefrontAPI.Collection,
  'id' | 'title' | 'handle'
> & {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
};

export type StoreCollectionsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type StoreCollectionsQuery = {
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasNextPage' | 'hasPreviousPage' | 'startCursor' | 'endCursor'
    >;
  };
};

export type CatalogQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  filters?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.ProductFilter> | StorefrontAPI.ProductFilter
  >;
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.ProductCollectionSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
}>;

export type CatalogQuery = {
  collection?: StorefrontAPI.Maybe<{
    products: {
      nodes: Array<
        Pick<StorefrontAPI.Product, 'id' | 'handle' | 'title' | 'vendor'> & {
          featuredImage?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          priceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          compareAtPriceRange: {
            minVariantPrice: Pick<
              StorefrontAPI.MoneyV2,
              'amount' | 'currencyCode'
            >;
          };
          selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.ProductVariant, 'id' | 'availableForSale'>
          >;
          etaText?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
          sponsored?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          reviewsRating?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
          reviewsCount?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metafield, 'value'>
          >;
        }
      >;
      filters: Array<
        Pick<StorefrontAPI.Filter, 'id' | 'label' | 'type'> & {
          values: Array<
            Pick<StorefrontAPI.FilterValue, 'id' | 'label' | 'count' | 'input'>
          >;
        }
      >;
      pageInfo: Pick<
        StorefrontAPI.PageInfo,
        'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
      >;
    };
  }>;
};

export type ProductsPageCursorsQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  first: StorefrontAPI.Scalars['Int']['input'];
  filters?: StorefrontAPI.InputMaybe<
    Array<StorefrontAPI.ProductFilter> | StorefrontAPI.ProductFilter
  >;
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.ProductCollectionSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
}>;

export type ProductsPageCursorsQuery = {
  collection?: StorefrontAPI.Maybe<{
    products: {
      edges: Array<
        Pick<StorefrontAPI.ProductEdge, 'cursor'> & {
          node: Pick<StorefrontAPI.Product, 'id'>;
        }
      >;
      pageInfo: Pick<StorefrontAPI.PageInfo, 'hasNextPage'>;
    };
  }>;
};

export type PageQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type PageQuery = {
  page?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Page, 'handle' | 'id' | 'title' | 'body'> & {
      seo?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Seo, 'description' | 'title'>
      >;
    }
  >;
};

export type PolicyFragment = Pick<
  StorefrontAPI.ShopPolicy,
  'body' | 'handle' | 'id' | 'title' | 'url'
>;

export type PolicyQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  privacyPolicy: StorefrontAPI.Scalars['Boolean']['input'];
  refundPolicy: StorefrontAPI.Scalars['Boolean']['input'];
  shippingPolicy: StorefrontAPI.Scalars['Boolean']['input'];
  termsOfService: StorefrontAPI.Scalars['Boolean']['input'];
}>;

export type PolicyQuery = {
  shop: {
    privacyPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    shippingPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    termsOfService?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    refundPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
  };
};

export type PolicyItemFragment = Pick<
  StorefrontAPI.ShopPolicy,
  'id' | 'title' | 'handle'
>;

export type PoliciesQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type PoliciesQuery = {
  shop: {
    privacyPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    shippingPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    termsOfService?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    refundPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    subscriptionPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicyWithDefault, 'id' | 'title' | 'handle'>
    >;
  };
};

export type ProductVariantFragment = Pick<
  StorefrontAPI.ProductVariant,
  'availableForSale' | 'id' | 'sku' | 'title'
> & {
  compareAtPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  image?: StorefrontAPI.Maybe<
    {__typename: 'Image'} & Pick<
      StorefrontAPI.Image,
      'id' | 'url' | 'altText' | 'width' | 'height'
    >
  >;
  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
  selectedOptions: Array<Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>>;
  unitPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
};

export type ProductFragment = Pick<
  StorefrontAPI.Product,
  | 'id'
  | 'title'
  | 'vendor'
  | 'handle'
  | 'descriptionHtml'
  | 'description'
  | 'encodedVariantExistence'
  | 'encodedVariantAvailability'
> & {
  images: {
    nodes: Array<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
  };
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'handle' | 'title'> & {
        products: {nodes: Array<Pick<StorefrontAPI.Product, 'id'>>};
      }
    >;
  };
  options: Array<
    Pick<StorefrontAPI.ProductOption, 'name'> & {
      optionValues: Array<
        Pick<StorefrontAPI.ProductOptionValue, 'name'> & {
          firstSelectableVariant?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.ProductVariant,
              'availableForSale' | 'id' | 'sku' | 'title'
            > & {
              compareAtPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
              image?: StorefrontAPI.Maybe<
                {__typename: 'Image'} & Pick<
                  StorefrontAPI.Image,
                  'id' | 'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
              product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
              selectedOptions: Array<
                Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
              >;
              unitPrice?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
              >;
            }
          >;
          swatch?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.ProductOptionValueSwatch, 'color'> & {
              image?: StorefrontAPI.Maybe<{
                previewImage?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url'>
                >;
              }>;
            }
          >;
        }
      >;
    }
  >;
  selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.ProductVariant,
      'availableForSale' | 'id' | 'sku' | 'title'
    > & {
      compareAtPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      image?: StorefrontAPI.Maybe<
        {__typename: 'Image'} & Pick<
          StorefrontAPI.Image,
          'id' | 'url' | 'altText' | 'width' | 'height'
        >
      >;
      price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
      selectedOptions: Array<
        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
      >;
      unitPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
    }
  >;
  adjacentVariants: Array<
    Pick<
      StorefrontAPI.ProductVariant,
      'availableForSale' | 'id' | 'sku' | 'title'
    > & {
      compareAtPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
      image?: StorefrontAPI.Maybe<
        {__typename: 'Image'} & Pick<
          StorefrontAPI.Image,
          'id' | 'url' | 'altText' | 'width' | 'height'
        >
      >;
      price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
      selectedOptions: Array<
        Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
      >;
      unitPrice?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
      >;
    }
  >;
  seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
  policyMetafield?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<{
      shippingPolicyField?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value' | 'type'>
      >;
      returnsRefundsField?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value' | 'type'>
      >;
      warrantyPolicyField?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value' | 'type'>
      >;
    }>;
  }>;
};

export type ProductQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  selectedOptions:
    | Array<StorefrontAPI.SelectedOptionInput>
    | StorefrontAPI.SelectedOptionInput;
  breadcrumbCollectionsFirst: StorefrontAPI.Scalars['Int']['input'];
  breadcrumbCollectionProductsCap: StorefrontAPI.Scalars['Int']['input'];
}>;

export type ProductQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Product,
      | 'id'
      | 'title'
      | 'vendor'
      | 'handle'
      | 'descriptionHtml'
      | 'description'
      | 'encodedVariantExistence'
      | 'encodedVariantAvailability'
    > & {
      images: {
        nodes: Array<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
      };
      collections: {
        nodes: Array<
          Pick<StorefrontAPI.Collection, 'handle' | 'title'> & {
            products: {nodes: Array<Pick<StorefrontAPI.Product, 'id'>>};
          }
        >;
      };
      options: Array<
        Pick<StorefrontAPI.ProductOption, 'name'> & {
          optionValues: Array<
            Pick<StorefrontAPI.ProductOptionValue, 'name'> & {
              firstSelectableVariant?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.ProductVariant,
                  'availableForSale' | 'id' | 'sku' | 'title'
                > & {
                  compareAtPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  image?: StorefrontAPI.Maybe<
                    {__typename: 'Image'} & Pick<
                      StorefrontAPI.Image,
                      'id' | 'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
                  selectedOptions: Array<
                    Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                  >;
                  unitPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                }
              >;
              swatch?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductOptionValueSwatch, 'color'> & {
                  image?: StorefrontAPI.Maybe<{
                    previewImage?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.Image, 'url'>
                    >;
                  }>;
                }
              >;
            }
          >;
        }
      >;
      selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontAPI.Maybe<
            {__typename: 'Image'} & Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        }
      >;
      adjacentVariants: Array<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontAPI.Maybe<
            {__typename: 'Image'} & Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        }
      >;
      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
      policyMetafield?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<{
          shippingPolicyField?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MetaobjectField, 'value' | 'type'>
          >;
          returnsRefundsField?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MetaobjectField, 'value' | 'type'>
          >;
          warrantyPolicyField?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MetaobjectField, 'value' | 'type'>
          >;
        }>;
      }>;
    }
  >;
  shop: {
    shippingPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body'>
    >;
    refundPolicy?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ShopPolicy, 'body'>>;
  };
  shippingPage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Page, 'body'>>;
  refundPage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Page, 'body'>>;
  warrantyPage?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Page, 'body'>>;
};

export type PredictiveArticleFragment = {__typename: 'Article'} & Pick<
  StorefrontAPI.Article,
  'id' | 'title' | 'handle' | 'trackingParameters'
> & {
    blog: Pick<StorefrontAPI.Blog, 'handle'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
    >;
  };

export type PredictiveCollectionFragment = {__typename: 'Collection'} & Pick<
  StorefrontAPI.Collection,
  'id' | 'title' | 'handle' | 'trackingParameters'
> & {
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
    >;
  };

export type PredictivePageFragment = {__typename: 'Page'} & Pick<
  StorefrontAPI.Page,
  'id' | 'title' | 'handle' | 'trackingParameters'
>;

export type PredictiveProductFragment = {__typename: 'Product'} & Pick<
  StorefrontAPI.Product,
  'id' | 'title' | 'handle' | 'trackingParameters'
> & {
    selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ProductVariant, 'id'> & {
        image?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
      }
    >;
  };

export type PredictiveQueryFragment = {
  __typename: 'SearchQuerySuggestion';
} & Pick<
  StorefrontAPI.SearchQuerySuggestion,
  'text' | 'styledText' | 'trackingParameters'
>;

export type PredictiveSearchQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  limit: StorefrontAPI.Scalars['Int']['input'];
  limitScope: StorefrontAPI.PredictiveSearchLimitScope;
  term: StorefrontAPI.Scalars['String']['input'];
  types?: StorefrontAPI.InputMaybe<
    | Array<StorefrontAPI.PredictiveSearchType>
    | StorefrontAPI.PredictiveSearchType
  >;
}>;

export type PredictiveSearchQuery = {
  predictiveSearch?: StorefrontAPI.Maybe<{
    articles: Array<
      {__typename: 'Article'} & Pick<
        StorefrontAPI.Article,
        'id' | 'title' | 'handle' | 'trackingParameters'
      > & {
          blog: Pick<StorefrontAPI.Blog, 'handle'>;
          image?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
          >;
        }
    >;
    collections: Array<
      {__typename: 'Collection'} & Pick<
        StorefrontAPI.Collection,
        'id' | 'title' | 'handle' | 'trackingParameters'
      > & {
          image?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
          >;
        }
    >;
    pages: Array<
      {__typename: 'Page'} & Pick<
        StorefrontAPI.Page,
        'id' | 'title' | 'handle' | 'trackingParameters'
      >
    >;
    products: Array<
      {__typename: 'Product'} & Pick<
        StorefrontAPI.Product,
        'id' | 'title' | 'handle' | 'trackingParameters'
      > & {
          selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.ProductVariant, 'id'> & {
              image?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.Image,
                  'url' | 'altText' | 'width' | 'height'
                >
              >;
              price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
            }
          >;
        }
    >;
    queries: Array<
      {__typename: 'SearchQuerySuggestion'} & Pick<
        StorefrontAPI.SearchQuerySuggestion,
        'text' | 'styledText' | 'trackingParameters'
      >
    >;
  }>;
};

interface GeneratedQueryTypes {
  '#graphql\n  query MenuCollectionImages($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    nodes(ids: $ids) {\n      ... on Collection {\n        id\n        image {\n          url\n          altText\n        }\n      }\n    }\n  }\n': {
    return: MenuCollectionImagesQuery;
    variables: MenuCollectionImagesQueryVariables;
  };
  '#graphql\n  query Article(\n    $articleHandle: String!\n    $blogHandle: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    blog(handle: $blogHandle) {\n      handle\n      articleByHandle(handle: $articleHandle) {\n        id\n        handle\n        title\n        contentHtml\n        publishedAt\n        author: authorV2 {\n          name\n        }\n        image {\n          id\n          altText\n          url\n          width\n          height\n        }\n        seo {\n          description\n          title\n        }\n        blog {\n          handle\n        }\n        layoutVariant: metafield(namespace: "custom", key: "layout_variant") {\n          value\n        }\n        # Points at a single "Author" metaobject entry (see README.md\n        # for the metaobject definition: name / bio / avatar fields).\n        # One entry per person, reused across every article they\'re\n        # credited on — edit the metaobject once, every article that\n        # references it picks up the change.\n        authorProfile: metafield(namespace: "custom", key: "author_profile") {\n          reference {\n            ... on Metaobject {\n              name: field(key: "name") {\n                value\n              }\n              bio: field(key: "bio") {\n                value\n              }\n              avatar: field(key: "avatar") {\n                reference {\n                  ... on MediaImage {\n                    image {\n                      url\n                      altText\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n        showAuthorSection: metafield(\n          namespace: "custom"\n          key: "show_author_section"\n        ) {\n          value\n        }\n        showToc: metafield(namespace: "custom", key: "show_toc") {\n          value\n        }\n        # "Related blogs" section (see RelatedBlogPosts.tsx /\n        # RelatedBlogPosts.md). Editor-curated list, NOT an\n        # algorithmic/tag-ranked lookup — the merchant picks exactly\n        # which posts show, in what order, via this metafield\n        # (Settings > Custom data > Articles > "Related Blog Posts",\n        # type: List > Article). If the list is empty,\n        # RelatedBlogPosts renders nothing — no separate "enabled"\n        # flag needed, presence of items IS the toggle (there used to\n        # be a custom.show_related_posts gating metafield plus a\n        # tag-ranked automatic fallback; both were removed — this\n        # metafield is now the sole source of truth).\n        #\n        # first: 10 is an arbitrary cap on how many references this\n        # query will resolve — raise it if a merchant needs a longer\n        # list than that (and raise the limit option passed to\n        # getRelatedPostsData to match, if you want more than 3 shown).\n        relatedBlogPosts: metafield(\n          namespace: "custom"\n          key: "related_blog_posts"\n        ) {\n          references(first: 10) {\n            nodes {\n              ... on Article {\n                id\n                handle\n                title\n                publishedAt\n                image {\n                  url\n                  altText\n                  width\n                  height\n                }\n                blog {\n                  handle\n                }\n              }\n            }\n          }\n        }\n        # Gates the "Social sharing" card (see SocialShare.tsx /\n        # social-share.md). Same "true"/"false" string-value pattern as\n        # the other show* metafields above — isSocialShareEnabled()\n        # checks value === \'true\' (or, per the route\'s original\n        # comment, may currently default to true when unset — confirm\n        # against SocialShare.tsx\'s actual gating logic once this field\n        # is wired in, since it was previously a no-op with no metafield\n        # to read at all).\n        showSocialShare: metafield(\n          namespace: "custom"\n          key: "show_social_share"\n        ) {\n          value\n        }\n        # "Related products" sidebar (see RelatedProducts.tsx /\n        # RelatedProducts.md). Editor-curated list, NOT an\n        # algorithmic-recommendations lookup — the merchant picks\n        # exactly which products show, in what order, via this\n        # metafield (Settings > Custom data > Articles > "Related\n        # Products", type: List > Product). If the list is empty,\n        # RelatedProducts renders nothing — no separate "enabled"\n        # flag needed, presence of items IS the toggle.\n        #\n        # first: 10 is an arbitrary cap on how many references this\n        # query will resolve — raise it if a merchant needs a longer\n        # list than that.\n        relatedProducts: metafield(\n          namespace: "custom"\n          key: "related_products"\n        ) {\n          references(first: 10) {\n            nodes {\n              ... on Product {\n                id\n              }\n            }\n          }\n        }\n        # "Latest blogs" sidebar (see LatestBlogs.tsx / LatestBlogs.md).\n        # Editor-curated list, NOT the tag-ranked candidate pool —\n        # the merchant picks exactly which posts show, in what order,\n        # via this metafield (Settings > Custom data > Articles >\n        # "Latest Blogs", type: List > Blog post). Empty list = the\n        # component renders nothing, same toggle-by-presence pattern\n        # as relatedProducts above.\n        #\n        # Unlike relatedProducts, no second batch query is needed:\n        # Article nodes resolve fully here — including their own\n        # blog.handle for cross-blog links — directly off this\n        # reference.\n        latestBlogs: metafield(namespace: "custom", key: "latest_blogs") {\n          references(first: 10) {\n            nodes {\n              ... on Article {\n                id\n                title\n                handle\n                publishedAt\n                image {\n                  url\n                  altText\n                  width\n                  height\n                }\n                blog {\n                  handle\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: ArticleQuery;
    variables: ArticleQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    handle\n    title\n    vendor\n    featuredImage {\n      id\n      url\n      altText\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    selectedOrFirstAvailableVariant(\n      selectedOptions: []\n      ignoreUnknownOptions: true\n      caseInsensitiveMatch: true\n    ) {\n      id\n      availableForSale\n    }\n    etaText: metafield(namespace: "custom", key: "eta_text") {\n      value\n    }\n    sponsored: metafield(namespace: "custom", key: "sponsored") {\n      value\n    }\n    reviewsRating: metafield(namespace: "reviews", key: "rating") {\n      value\n    }\n    reviewsCount: metafield(namespace: "reviews", key: "rating_count") {\n      value\n    }\n  }\n\n  query ShoppableProducts($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)\n    @inContext(language: $language, country: $country) {\n    nodes(ids: $ids) {\n      ... on Product {\n        ...ProductCard\n      }\n    }\n  }\n': {
    return: ShoppableProductsQuery;
    variables: ShoppableProductsQueryVariables;
  };
  '#graphql\n  fragment Shop on Shop {\n    id\n    name\n    description\n    primaryDomain {\n      url\n    }\n    brand {\n      logo {\n        image {\n          url\n        }\n      }\n    }\n  }\n  query Header(\n    $country: CountryCode\n    $headerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    shop {\n      ...Shop\n    }\n    menu(handle: $headerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: HeaderQuery;
    variables: HeaderQueryVariables;
  };
  '#graphql\n  query Footer(\n    $country: CountryCode\n    $footerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    menu(handle: $footerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: FooterQuery;
    variables: FooterQueryVariables;
  };
  '#graphql\n  query ProductRecommendations(\n    $productId: ID!\n    $intent: ProductRecommendationIntent\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    productRecommendations(productId: $productId, intent: $intent) {\n      ...ProductCard\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    handle\n    title\n    vendor\n    featuredImage {\n      id\n      url\n      altText\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    selectedOrFirstAvailableVariant(\n      selectedOptions: []\n      ignoreUnknownOptions: true\n      caseInsensitiveMatch: true\n    ) {\n      id\n      availableForSale\n    }\n    etaText: metafield(namespace: "custom", key: "eta_text") {\n      value\n    }\n    sponsored: metafield(namespace: "custom", key: "sponsored") {\n      value\n    }\n    reviewsRating: metafield(namespace: "reviews", key: "rating") {\n      value\n    }\n    reviewsCount: metafield(namespace: "reviews", key: "rating_count") {\n      value\n    }\n  }\n\n': {
    return: ProductRecommendationsQuery;
    variables: ProductRecommendationsQueryVariables;
  };
  '#graphql\n  fragment FlatMenuItem on MenuItem {\n    id\n    title\n    url\n  }\n  query FooterMenu(\n    $country: CountryCode\n    $footerMenuHandle: String!\n    $policiesMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    menu(handle: $footerMenuHandle) {\n      id\n      items {\n        id\n        title\n        url\n        items {\n          id\n          title\n          url\n        }\n      }\n    }\n    policiesMenu: menu(handle: $policiesMenuHandle) {\n      id\n      items {\n        ...FlatMenuItem\n      }\n    }\n  }\n': {
    return: FooterMenuQuery;
    variables: FooterMenuQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment CollectionCard on Collection {\n    id\n    handle\n    title\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n  }\n\n  query ShopByCategory($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    collections(first: 10, sortKey: TITLE) {\n      nodes {\n        ...CollectionCard\n      }\n    }\n  }\n': {
    return: ShopByCategoryQuery;
    variables: ShopByCategoryQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    handle\n    title\n    vendor\n    featuredImage {\n      id\n      url\n      altText\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    selectedOrFirstAvailableVariant(\n      selectedOptions: []\n      ignoreUnknownOptions: true\n      caseInsensitiveMatch: true\n    ) {\n      id\n      availableForSale\n    }\n    etaText: metafield(namespace: "custom", key: "eta_text") {\n      value\n    }\n    sponsored: metafield(namespace: "custom", key: "sponsored") {\n      value\n    }\n    reviewsRating: metafield(namespace: "reviews", key: "rating") {\n      value\n    }\n    reviewsCount: metafield(namespace: "reviews", key: "rating_count") {\n      value\n    }\n  }\n\n  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    products(first: 4, sortKey: UPDATED_AT, reverse: true) {\n      nodes {\n        ...ProductCard\n      }\n    }\n  }\n': {
    return: RecommendedProductsQuery;
    variables: RecommendedProductsQueryVariables;
  };
  '#graphql\n  query PredictiveSearchInstant(\n    $country: CountryCode\n    $language: LanguageCode\n    $limit: Int!\n    $limitScope: PredictiveSearchLimitScope!\n    $query: String!\n    $types: [PredictiveSearchType!]\n  ) @inContext(country: $country, language: $language) {\n    predictiveSearch(\n      limit: $limit\n      limitScope: $limitScope\n      query: $query\n      types: $types\n    ) {\n      queries {\n        text\n      }\n      products {\n        id\n        title\n        handle\n        vendor\n        productType\n        tags\n        selectedOrFirstAvailableVariant(\n          ignoreUnknownOptions: true\n          caseInsensitiveMatch: true\n        ) {\n          image {\n            url\n            altText\n          }\n          price {\n            amount\n            currencyCode\n          }\n          compareAtPrice {\n            amount\n            currencyCode\n          }\n        }\n      }\n      collections {\n        id\n        title\n        handle\n        image {\n          url\n          altText\n        }\n      }\n      articles {\n        id\n        title\n        handle\n        publishedAt\n        image {\n          url\n          altText\n        }\n        blog {\n          handle\n        }\n      }\n      pages {\n        id\n        title\n        handle\n      }\n    }\n  }\n': {
    return: PredictiveSearchInstantQuery;
    variables: PredictiveSearchInstantQueryVariables;
  };
  '#graphql\n  query QuickView(\n    $country: CountryCode\n    $handle: String!\n    $language: LanguageCode\n    $selectedOptions: [SelectedOptionInput!]!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      ...QuickViewProduct\n    }\n  }\n  #graphql\n  fragment QuickViewProduct on Product {\n    id\n    title\n    vendor\n    handle\n    encodedVariantExistence\n    encodedVariantAvailability\n    images(first: 6) {\n      nodes {\n        id\n        url\n        altText\n        width\n        height\n      }\n    }\n    options {\n      name\n      optionValues {\n        name\n        firstSelectableVariant {\n          ...QuickViewVariant\n        }\n        swatch {\n          color\n          image {\n            previewImage {\n              url\n            }\n          }\n        }\n      }\n    }\n    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {\n      ...QuickViewVariant\n    }\n    adjacentVariants(selectedOptions: $selectedOptions) {\n      ...QuickViewVariant\n    }\n    reviewsRating: metafield(namespace: "reviews", key: "rating") {\n      value\n    }\n    reviewsCount: metafield(namespace: "reviews", key: "rating_count") {\n      value\n    }\n  }\n  #graphql\n  fragment QuickViewVariant on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    id\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    selectedOptions {\n      name\n      value\n    }\n    sku\n    title\n  }\n\n\n': {
    return: QuickViewQuery;
    variables: QuickViewQueryVariables;
  };
  '#graphql\n  query BlogTagged(\n    $blogHandle: String!\n    $query: String\n    $country: CountryCode\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $startCursor: String\n  ) @inContext(country: $country, language: $language) {\n    blog(handle: $blogHandle) {\n      title\n      handle\n      articles(\n        query: $query,\n        first: $first,\n        last: $last,\n        before: $startCursor,\n        after: $endCursor\n      ) {\n        pageInfo {\n          hasNextPage\n          hasPreviousPage\n          startCursor\n          endCursor\n        }\n        nodes {\n          id\n          title\n          handle\n        }\n      }\n    }\n  }\n': {
    return: BlogTaggedQuery;
    variables: BlogTaggedQueryVariables;
  };
  '#graphql\n  query Blogs(\n    $country: CountryCode\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $startCursor: String\n  ) @inContext(country: $country, language: $language) {\n    blogs(\n      first: $first,\n      last: $last,\n      before: $startCursor,\n      after: $endCursor\n    ) {\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n        startCursor\n        endCursor\n      }\n      nodes {\n        id\n        title\n        handle\n        seo {\n          title\n          description\n        }\n      }\n    }\n  }\n': {
    return: BlogsQuery;
    variables: BlogsQueryVariables;
  };
  '#graphql\n  #graphql\n  fragment ProductCard on Product {\n    id\n    handle\n    title\n    vendor\n    featuredImage {\n      id\n      url\n      altText\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    selectedOrFirstAvailableVariant(\n      selectedOptions: []\n      ignoreUnknownOptions: true\n      caseInsensitiveMatch: true\n    ) {\n      id\n      availableForSale\n    }\n    etaText: metafield(namespace: "custom", key: "eta_text") {\n      value\n    }\n    sponsored: metafield(namespace: "custom", key: "sponsored") {\n      value\n    }\n    reviewsRating: metafield(namespace: "reviews", key: "rating") {\n      value\n    }\n    reviewsCount: metafield(namespace: "reviews", key: "rating_count") {\n      value\n    }\n  }\n\n  #graphql\n  fragment ArticleItem on Article {\n    id\n    handle\n    title\n    excerpt\n    publishedAt\n    blog {\n      handle\n    }\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n    readingTime: metafield(namespace: "custom", key: "reading_time") {\n      value\n    }\n  }\n\n  #graphql\n  fragment SubCollectionItem on Collection {\n    id\n    handle\n    title\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n  }\n\n  #graphql\n  #graphql\n  fragment PromoCard on Metaobject {\n    id\n    image: field(key: "image") {\n      reference {\n        ... on MediaImage {\n          image {\n            url\n            altText\n            width\n            height\n          }\n        }\n      }\n    }\n    heading: field(key: "heading") {\n      value\n    }\n    linkText: field(key: "link_text") {\n      value\n    }\n    linkUrl: field(key: "link_url") {\n      value\n    }\n  }\n\n  fragment SponsoredAds on Metaobject {\n    id\n    heading: field(key: "heading") {\n      value\n    }\n    subheading: field(key: "subheading") {\n      value\n    }\n    position: field(key: "grid_position") {\n      value\n    }\n    promoCard: field(key: "promo_card") {\n      reference {\n        ... on Metaobject {\n          ...PromoCard\n        }\n      }\n    }\n    products: field(key: "products") {\n      reference {\n        ... on Collection {\n          id\n          handle\n          title\n          products(first: 8) {\n            nodes {\n              ...ProductCard\n            }\n          }\n        }\n      }\n    }\n  }\n\n  #graphql\n  #graphql\n  fragment LayoutVariantValue on Metaobject {\n    variant: field(key: "variant") {\n      value\n    }\n  }\n\n  fragment PromoBanner on Metaobject {\n    id\n    variant: field(key: "layout") {\n      reference {\n        ... on Metaobject {\n          ...LayoutVariantValue\n        }\n      }\n    }\n    heading: field(key: "heading") {\n      value\n    }\n    subheading: field(key: "subheading") {\n      value\n    }\n    image: field(key: "image") {\n      reference {\n        ... on MediaImage {\n          image {\n            url\n            altText\n            width\n            height\n          }\n        }\n      }\n    }\n    linkText: field(key: "link_text") {\n      value\n    }\n    linkUrl: field(key: "link_url") {\n      value\n    }\n    backgroundColor: field(key: "background_color") {\n      value\n    }\n    textAlignment: field(key: "text_alignment") {\n      value\n    }\n    position: field(key: "grid_position") {\n      value\n    }\n  }\n\n  query Collection(\n    $handle: String!\n    $country: CountryCode\n    $language: LanguageCode\n    $filters: [ProductFilter!]\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      descriptionHtml\n      bannerTextAlignmentMetafield: metafield(namespace: "custom", key: "banner_text_alignment") {\n        value\n      }\n      postsMetafield: metafield(namespace: "custom", key: "posts") {\n        references(first: 10) {\n          nodes {\n            ... on Article {\n              ...ArticleItem\n            }\n          }\n        }\n      }\n      subCollectionsMetafield: metafield(namespace: "custom", key: "sub_collections") {\n        references(first: 20) {\n          nodes {\n            ... on Collection {\n              ...SubCollectionItem\n            }\n          }\n        }\n      }\n      afterItemsMetafield: metafield(namespace: "custom", key: "after_item_lists") {\n        reference {\n          __typename\n          ... on Page {\n            id\n            body\n          }\n        }\n      }\n      sponsoredAdsMetafield: metafield(namespace: "custom", key: "sponsored_ads") {\n        reference {\n          ... on Metaobject {\n            ...SponsoredAds\n          }\n        }\n      }\n      promoBannerMetafield: metafield(namespace: "custom", key: "promo_banner") {\n        reference {\n          ... on Metaobject {\n            ...PromoBanner\n          }\n        }\n      }\n      products(\n        first: $first,\n        last: $last,\n        before: $startCursor,\n        after: $endCursor,\n        filters: $filters\n      ) {\n        filters {\n          id\n          label\n          type\n          values {\n            id\n            label\n            count\n            input\n          }\n        }\n        nodes {\n          ...ProductCard\n        }\n        pageInfo {\n          hasPreviousPage\n          hasNextPage\n          endCursor\n          startCursor\n        }\n      }\n    }\n  }\n': {
    return: CollectionQuery;
    variables: CollectionQueryVariables;
  };
  '#graphql\n  fragment Collection on Collection {\n    id\n    title\n    handle\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n  }\n  query StoreCollections(\n    $country: CountryCode\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $startCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collections(\n      first: $first,\n      last: $last,\n      before: $startCursor,\n      after: $endCursor\n    ) {\n      nodes {\n        ...Collection\n      }\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n': {
    return: StoreCollectionsQuery;
    variables: StoreCollectionsQueryVariables;
  };
  '#graphql\n  query Catalog(\n    $handle: String!\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n    $filters: [ProductFilter!]\n    $sortKey: ProductCollectionSortKeys\n    $reverse: Boolean\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      products(\n        first: $first\n        last: $last\n        before: $startCursor\n        after: $endCursor\n        filters: $filters\n        sortKey: $sortKey\n        reverse: $reverse\n      ) {\n        nodes {\n          ...ProductCard\n        }\n        filters {\n          id\n          label\n          type\n          values {\n            id\n            label\n            count\n            input\n          }\n        }\n        pageInfo {\n          hasPreviousPage\n          hasNextPage\n          startCursor\n          endCursor\n        }\n      }\n    }\n  }\n  #graphql\n  fragment ProductCard on Product {\n    id\n    handle\n    title\n    vendor\n    featuredImage {\n      id\n      url\n      altText\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    compareAtPriceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    selectedOrFirstAvailableVariant(\n      selectedOptions: []\n      ignoreUnknownOptions: true\n      caseInsensitiveMatch: true\n    ) {\n      id\n      availableForSale\n    }\n    etaText: metafield(namespace: "custom", key: "eta_text") {\n      value\n    }\n    sponsored: metafield(namespace: "custom", key: "sponsored") {\n      value\n    }\n    reviewsRating: metafield(namespace: "reviews", key: "rating") {\n      value\n    }\n    reviewsCount: metafield(namespace: "reviews", key: "rating_count") {\n      value\n    }\n  }\n\n': {
    return: CatalogQuery;
    variables: CatalogQueryVariables;
  };
  '#graphql\n  query ProductsPageCursors(\n    $handle: String!\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int!\n    $filters: [ProductFilter!]\n    $sortKey: ProductCollectionSortKeys\n    $reverse: Boolean\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      products(first: $first, filters: $filters, sortKey: $sortKey, reverse: $reverse) {\n        edges {\n          cursor\n          node {\n            id\n          }\n        }\n        pageInfo {\n          hasNextPage\n        }\n      }\n    }\n  }\n': {
    return: ProductsPageCursorsQuery;
    variables: ProductsPageCursorsQueryVariables;
  };
  '#graphql\n  query Page(\n    $language: LanguageCode,\n    $country: CountryCode,\n    $handle: String!\n  )\n  @inContext(language: $language, country: $country) {\n    page(handle: $handle) {\n      handle\n      id\n      title\n      body\n      seo {\n        description\n        title\n      }\n    }\n  }\n': {
    return: PageQuery;
    variables: PageQueryVariables;
  };
  '#graphql\n  fragment Policy on ShopPolicy {\n    body\n    handle\n    id\n    title\n    url\n  }\n  query Policy(\n    $country: CountryCode\n    $language: LanguageCode\n    $privacyPolicy: Boolean!\n    $refundPolicy: Boolean!\n    $shippingPolicy: Boolean!\n    $termsOfService: Boolean!\n  ) @inContext(language: $language, country: $country) {\n    shop {\n      privacyPolicy @include(if: $privacyPolicy) {\n        ...Policy\n      }\n      shippingPolicy @include(if: $shippingPolicy) {\n        ...Policy\n      }\n      termsOfService @include(if: $termsOfService) {\n        ...Policy\n      }\n      refundPolicy @include(if: $refundPolicy) {\n        ...Policy\n      }\n    }\n  }\n': {
    return: PolicyQuery;
    variables: PolicyQueryVariables;
  };
  '#graphql\n  fragment PolicyItem on ShopPolicy {\n    id\n    title\n    handle\n  }\n  query Policies ($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    shop {\n      privacyPolicy {\n        ...PolicyItem\n      }\n      shippingPolicy {\n        ...PolicyItem\n      }\n      termsOfService {\n        ...PolicyItem\n      }\n      refundPolicy {\n        ...PolicyItem\n      }\n      subscriptionPolicy {\n        id\n        title\n        handle\n      }\n    }\n  }\n': {
    return: PoliciesQuery;
    variables: PoliciesQueryVariables;
  };
  '#graphql\n  query Product(\n    $country: CountryCode\n    $handle: String!\n    $language: LanguageCode\n    $selectedOptions: [SelectedOptionInput!]!\n    $breadcrumbCollectionsFirst: Int!\n    $breadcrumbCollectionProductsCap: Int!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      ...Product\n    }\n    shop {\n      shippingPolicy {\n        body\n      }\n      refundPolicy {\n        body\n      }\n    }\n    shippingPage: page(handle: "shipping-policy") {\n      body\n    }\n    refundPage: page(handle: "refund-policy") {\n      body\n    }\n    warrantyPage: page(handle: "warranty") {\n      body\n    }\n  }\n  #graphql\n  fragment Product on Product {\n    id\n    title\n    vendor\n    handle\n    descriptionHtml\n    description\n    encodedVariantExistence\n    encodedVariantAvailability\n    images(first: 12) {\n      nodes {\n        id\n        url\n        altText\n        width\n        height\n      }\n    }\n    collections(first: $breadcrumbCollectionsFirst) {\n      nodes {\n        handle\n        title\n        products(first: $breadcrumbCollectionProductsCap) {\n          nodes {\n            id\n          }\n        }\n      }\n    }\n    options {\n      name\n      optionValues {\n        name\n        firstSelectableVariant {\n          ...ProductVariant\n        }\n        swatch {\n          color\n          image {\n            previewImage {\n              url\n            }\n          }\n        }\n      }\n    }\n    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {\n      ...ProductVariant\n    }\n    adjacentVariants (selectedOptions: $selectedOptions) {\n      ...ProductVariant\n    }\n    seo {\n      description\n      title\n    }\n    policyMetafield: metafield(namespace: "custom", key: "product_policy") {\n      reference {\n        ... on Metaobject {\n          shippingPolicyField: field(key: "shipping_policy") {\n            value\n            type\n          }\n          returnsRefundsField: field(key: "returns_refunds") {\n            value\n            type\n          }\n          warrantyPolicyField: field(key: "warranty_policy") {\n            value\n            type\n          }\n        }\n      }\n    }\n  }\n  #graphql\n  fragment ProductVariant on ProductVariant {\n    availableForSale\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n    id\n    image {\n      __typename\n      id\n      url\n      altText\n      width\n      height\n    }\n    price {\n      amount\n      currencyCode\n    }\n    product {\n      title\n      handle\n    }\n    selectedOptions {\n      name\n      value\n    }\n    sku\n    title\n    unitPrice {\n      amount\n      currencyCode\n    }\n  }\n\n\n': {
    return: ProductQuery;
    variables: ProductQueryVariables;
  };
  '#graphql\n  query PredictiveSearch(\n    $country: CountryCode\n    $language: LanguageCode\n    $limit: Int!\n    $limitScope: PredictiveSearchLimitScope!\n    $term: String!\n    $types: [PredictiveSearchType!]\n  ) @inContext(country: $country, language: $language) {\n    predictiveSearch(\n      limit: $limit,\n      limitScope: $limitScope,\n      query: $term,\n      types: $types,\n    ) {\n      articles {\n        ...PredictiveArticle\n      }\n      collections {\n        ...PredictiveCollection\n      }\n      pages {\n        ...PredictivePage\n      }\n      products {\n        ...PredictiveProduct\n      }\n      queries {\n        ...PredictiveQuery\n      }\n    }\n  }\n  #graphql\n  fragment PredictiveArticle on Article {\n    __typename\n    id\n    title\n    handle\n    blog {\n      handle\n    }\n    image {\n      url\n      altText\n      width\n      height\n    }\n    trackingParameters\n  }\n\n  #graphql\n  fragment PredictiveCollection on Collection {\n    __typename\n    id\n    title\n    handle\n    image {\n      url\n      altText\n      width\n      height\n    }\n    trackingParameters\n  }\n\n  #graphql\n  fragment PredictivePage on Page {\n    __typename\n    id\n    title\n    handle\n    trackingParameters\n  }\n\n  #graphql\n  fragment PredictiveProduct on Product {\n    __typename\n    id\n    title\n    handle\n    trackingParameters\n    selectedOrFirstAvailableVariant(\n      selectedOptions: []\n      ignoreUnknownOptions: true\n      caseInsensitiveMatch: true\n    ) {\n      id\n      image {\n        url\n        altText\n        width\n        height\n      }\n      price {\n        amount\n        currencyCode\n      }\n    }\n  }\n\n  #graphql\n  fragment PredictiveQuery on SearchQuerySuggestion {\n    __typename\n    text\n    styledText\n    trackingParameters\n  }\n\n': {
    return: PredictiveSearchQuery;
    variables: PredictiveSearchQueryVariables;
  };
}

interface GeneratedMutationTypes {
  '#graphql\n  mutation NewsletterCustomerCreate($input: CustomerCreateInput!) {\n    customerCreate(input: $input) {\n      customer {\n        id\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
    return: NewsletterCustomerCreateMutation;
    variables: NewsletterCustomerCreateMutationVariables;
  };
}

declare module '@shopify/hydrogen' {
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}

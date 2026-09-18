// app/components/ui — the ONLY folder allowed inside app/components.
// Anything here is a component that gets imported into another local
// component (a nested/sub-component or "snippet"). Anything that is
// only ever consumed by a route lives as a flat file one level up, in
// app/components/ directly.
export {AddToCartButton} from './AddToCartButton';
export {Aside, useAside} from './Aside';
export {CartLineItem, type CartLine} from './CartLineItem';
export {CartMain, type CartLayout, type CartMainProps} from './CartMain';
export {CartSummary} from './CartSummary';
export {Footer} from './Footer';
export {Header, HeaderMenu} from './Header';
export {ProductOptionSwatch} from './ProductOptionSwatch';
export {ProductPrice} from './ProductPrice';
export {SearchFormPredictive, SEARCH_ENDPOINT} from './SearchFormPredictive';
export {SearchResultsPredictive} from './SearchResultsPredictive';
export {SizeChip} from './SizeChip';
export {SwatchOption} from './SwatchOption';
export type {OptionValue} from './types';

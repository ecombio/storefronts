// app/components — top-level barrel. Flat files here are the composite
// components routes render directly; './ui' holds everything that's
// nested inside one of them. Re-exported together so consumers only
// ever need to import from '~/components'.
export {FilterSort} from './FilterSort';
export {MockShopNotice} from './MockShopNotice';
export {PageLayout} from './PageLayout';
export {PaginatedResourceSection} from './PaginatedResourceSection';
export {ProductAccordion} from './ProductAccordion';
export {ProductForm} from './ProductForm';
export {ProductGallery} from './ProductGallery';
export {ProductItem} from './ProductItem';
export {SearchForm} from './SearchForm';
export {SearchResults} from './SearchResults';
export * from './ui';

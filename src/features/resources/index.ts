/**
 * Public API of the Resource reference feature. Code outside this folder
 * imports only from here (enforced by eslint/boundaries.js).
 */
export { ResourceCatalog } from './components/ResourceCatalog';
export {
  parseResourceFilter,
  RESOURCE_FILTERS,
  type Resource,
  type ResourceFilter,
} from './model';

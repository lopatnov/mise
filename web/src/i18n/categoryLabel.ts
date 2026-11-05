import type { TFunction } from 'i18next';
import type { Category } from '../api/categories';

/** Built-in categories carry a slug and are translated by it; a category without one shows its stored name */
export function categoryLabel(category: Category, t: TFunction): string {
  return category.slug ? t(`categories.${category.slug}`, category.name) : category.name;
}

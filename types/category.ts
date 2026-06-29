/** Firestore `categories` collection document shape. */
export interface Category {
  categoryId: string;
  name: string;
  icon: string;
}

/** Fields required when creating a category. */
export interface CategoryCreateInput {
  categoryId: string;
  name: string;
  icon: string;
}

/** Fields that can be updated on an existing category. */
export interface CategoryUpdateInput {
  name?: string;
  icon?: string;
}

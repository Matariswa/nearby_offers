export const COLLECTIONS = {
  USERS: "users",
  SHOPS: "shops",
  OFFERS: "offers",
  CATEGORIES: "categories",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

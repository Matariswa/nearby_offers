export const COLLECTIONS = {
  USERS: "users",
  SHOPS: "shops",
  OFFERS: "offers",
  CATEGORIES: "categories",
  REVIEWS: "reviews",
  NOTIFICATIONS: "notifications",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

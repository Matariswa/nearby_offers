export type {
  FirestoreTimestamp,
  SerializedTimestamp,
  BaseDocumentMeta,
  AuditableDocumentMeta,
} from "@/types/common";

export type {
  UserRole,
  RegisterableRole,
  User,
  UserCreateInput,
  UserUpdateInput,
  SerializedUser,
} from "@/types/user";

export type {
  Shop,
  ShopCreateInput,
  ShopUpdateInput,
  SerializedShop,
} from "@/types/shop";

export type {
  Offer,
  OfferCreateInput,
  OfferUpdateInput,
  SerializedOffer,
} from "@/types/offer";

export type {
  Category,
  CategoryCreateInput,
  CategoryUpdateInput,
} from "@/types/category";

export interface NavLink {
  label: string;
  href: string;
}

export interface DashboardStat {
  label: string;
  value: string;
  change?: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  icon: string;
}

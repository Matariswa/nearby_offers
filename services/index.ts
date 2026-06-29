import { usersService } from "@/services/users.service";
import { shopsService } from "@/services/shops.service";
import { offersService } from "@/services/offers.service";
import { categoriesService } from "@/services/categories.service";

export { UsersService, usersService } from "@/services/users.service";
export { ShopsService, shopsService } from "@/services/shops.service";
export { OffersService, offersService } from "@/services/offers.service";
export {
  CategoriesService,
  categoriesService,
} from "@/services/categories.service";

export {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  sendPasswordReset,
  logoutUser,
  getUserProfile,
  createUserProfile,
  updateUserLastLogin,
  initializeAuthPersistence,
} from "@/services/auth.service";

/** Central registry for Firestore collection services. */
export const firestoreServices = {
  users: usersService,
  shops: shopsService,
  offers: offersService,
  categories: categoriesService,
} as const;

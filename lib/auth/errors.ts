export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("Firebase is not configured.");
    this.name = "FirebaseNotConfiguredError";
  }
}

const FIREBASE_AUTH_ERRORS: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/operation-not-allowed":
    "This sign-in method is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
  "auth/weak-password": "Password is too weak. Use at least 8 characters.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment and try again.",
  "auth/popup-closed-by-user": "Sign-in popup was closed before completing.",
  "auth/cancelled-popup-request": "Sign-in was cancelled. Please try again.",
  "auth/popup-blocked":
    "Popup was blocked by the browser. Allow popups and try again.",
  "auth/account-exists-with-different-credential":
    "An account already exists with the same email using a different sign-in method.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseNotConfiguredError) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return FIREBASE_AUTH_ERRORS[error.code] ?? "Authentication failed. Please try again.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

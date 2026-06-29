import type { RegisterableRole } from "@/types/user";

export function isRegisterableRole(value: string): value is RegisterableRole {
  return value === "customer" || value === "shop_owner";
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Weak" | "Fair" | "Good" | "Strong" | "Very Strong";
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
  isValid: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;

  let score: PasswordStrength["score"] = 0;
  let label: PasswordStrength["label"] = "Weak";

  if (passedChecks >= 5) {
    score = 4;
    label = "Very Strong";
  } else if (passedChecks === 4) {
    score = 3;
    label = "Strong";
  } else if (passedChecks === 3) {
    score = 2;
    label = "Good";
  } else if (passedChecks === 2) {
    score = 1;
    label = "Fair";
  }

  return {
    score,
    label,
    checks,
    isValid: Object.values(checks).every(Boolean),
  };
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: RegisterableRole;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();

  if (!trimmed) {
    return "Email is required.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Please enter a valid email address.";
  }

  return null;
}

export function validateLoginForm(values: LoginFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  if (!values.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

export function validateRegisterForm(
  values: RegisterFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) {
    errors.name = "Full name is required.";
  } else if (values.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  if (values.phone.trim() && !/^\+?[\d\s-()]{7,20}$/.test(values.phone.trim())) {
    errors.phone = "Please enter a valid phone number.";
  }

  const strength = evaluatePasswordStrength(values.password);
  if (!values.password) {
    errors.password = "Password is required.";
  } else if (!strength.isValid) {
    errors.password =
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (values.role !== "customer" && values.role !== "shop_owner") {
    errors.role = "Please select a valid account type.";
  }

  return errors;
}

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  return errors;
}

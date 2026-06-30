"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  AuthDivider,
  FormErrorBanner,
  FormField,
  TextInput,
} from "@/components/auth/AuthForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { getDashboardPathForRole } from "@/lib/auth/redirects";
import { isRegisterableRole, validateRegisterForm } from "@/lib/validators/auth";
import type { RegisterableRole } from "@/types/user";

export function RegisterForm() {
  const router = useRouter();
  const { signUp, signInGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<RegisterableRole>("customer");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const validationErrors = validateRegisterForm({
      name,
      email,
      phone,
      password,
      confirmPassword,
      role,
    });
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const profile = await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim() || undefined,
      });
      router.replace(getDashboardPathForRole(profile.role));
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to create account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setFormError("");
    setIsGoogleLoading(true);

    try {
      const profile = await signInGoogle({ role });
      router.replace(getDashboardPathForRole(profile.role));
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Google sign-in failed.",
      );
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <GuestRoute>
      <div className="container-app flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <Card className="w-full max-w-md" padding="lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>
              Join Nearby Offers and start discovering local deals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formError ? <FormErrorBanner message={formError} /> : null}

            <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
              <FormField label="Full name" id="name" error={errors.name}>
                <TextInput
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={name}
                  error={errors.name}
                  onChange={(event) => setName(event.target.value)}
                />
              </FormField>

              <FormField label="Email" id="email" error={errors.email}>
                <TextInput
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  error={errors.email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </FormField>

              <FormField
                label="Phone (optional)"
                id="phone"
                error={errors.phone}
              >
                <TextInput
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 555 000 0000"
                  value={phone}
                  error={errors.phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </FormField>

              <FormField label="Password" id="password" error={errors.password}>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={password}
                  error={errors.password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <div className="mt-3">
                  <PasswordStrengthMeter password={password} />
                </div>
              </FormField>

              <FormField
                label="Confirm password"
                id="confirmPassword"
                error={errors.confirmPassword}
              >
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  error={errors.confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </FormField>

              <FormField label="I am a" id="role" error={errors.role}>
                <select
                  id="role"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  value={role}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (isRegisterableRole(value)) {
                      setRole(value);
                    }
                  }}
                >
                  <option value="customer">Customer</option>
                  <option value="shop_owner">Shop Owner</option>
                </select>
              </FormField>

              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Create account
              </Button>
            </form>

            <AuthDivider />

            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              isLoading={isGoogleLoading}
              label="Sign up with Google"
            />

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </GuestRoute>
  );
}

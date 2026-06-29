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
import { getDashboardPathForRole } from "@/lib/auth/redirects";
import { validateLoginForm } from "@/lib/validators/auth";

export function LoginForm() {
  const router = useRouter();
  const { signIn, signInGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const validationErrors = validateLoginForm({ email, password });
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const profile = await signIn({ email, password });
      router.replace(getDashboardPathForRole(profile.role));
    } catch (error) {
      alert("Debug Login Error: " + (error instanceof Error ? error.message : String(error)));
      setFormError(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setFormError("");
    setIsGoogleLoading(true);

    try {
      const profile = await signInGoogle();
      router.replace(getDashboardPathForRole(profile.role));
    } catch (error) {
      alert("Debug Google Login Error: " + (error instanceof Error ? error.message : String(error)));
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
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your Nearby Offers account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formError ? <FormErrorBanner message={formError} /> : null}

            <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
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

              <FormField label="Password" id="password" error={errors.password}>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  error={errors.password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </FormField>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Sign in
              </Button>
            </form>

            <AuthDivider />

            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              isLoading={isGoogleLoading}
            />

            <p className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </GuestRoute>
  );
}

"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
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
  FormErrorBanner,
  FormField,
  FormSuccessBanner,
  TextInput,
} from "@/components/auth/AuthForm";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { validateForgotPasswordForm } from "@/lib/validators/auth";

export function ForgotPasswordForm() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const validationErrors = validateForgotPasswordForm({ email });
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(email.trim());
      setSuccessMessage(
        "Password reset email sent. Check your inbox for further instructions.",
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to send reset email.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <GuestRoute>
      <div className="container-app flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <Card className="w-full max-w-md" padding="lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formError ? <FormErrorBanner message={formError} /> : null}
            {successMessage ? (
              <FormSuccessBanner message={successMessage} />
            ) : null}

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

              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Send reset link
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </GuestRoute>
  );
}

"use client";

import { evaluatePasswordStrength } from "@/lib/validators/auth";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
}

const strengthColors = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) {
    return null;
  }

  const strength = evaluatePasswordStrength(password);

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-slate-200",
              index <= strength.score && strengthColors[strength.score],
            )}
          />
        ))}
      </div>
      <p className="text-xs font-medium text-slate-600">
        Password strength: {strength.label}
      </p>
      <ul className="grid grid-cols-2 gap-1 text-xs text-slate-500">
        <li className={strength.checks.minLength ? "text-green-600" : ""}>
          8+ characters
        </li>
        <li className={strength.checks.hasUppercase ? "text-green-600" : ""}>
          Uppercase letter
        </li>
        <li className={strength.checks.hasLowercase ? "text-green-600" : ""}>
          Lowercase letter
        </li>
        <li className={strength.checks.hasNumber ? "text-green-600" : ""}>
          Number
        </li>
        <li className={strength.checks.hasSpecialChar ? "text-green-600" : ""}>
          Special character
        </li>
      </ul>
    </div>
  );
}

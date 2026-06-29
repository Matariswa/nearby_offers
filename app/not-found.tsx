import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-app flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-slate-600">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It may
        have been moved or deleted.
      </p>
      <Link href="/" className="mt-8">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}

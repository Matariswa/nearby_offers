import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function FirebaseConfigAlert() {
  return (
    <div className="container-app flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <Card className="w-full max-w-2xl" padding="lg">
        <CardHeader>
          <CardTitle className="text-2xl">Firebase is not configured</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            Add your Firebase credentials to <code>.env.local</code> using the
            placeholders in <code>.env.example</code>, then restart the dev
            server.
          </p>

          <div>
            <p className="mb-2 font-semibold text-slate-900">
              Firebase Console setup
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open{" "}
                <Link
                  href="https://console.firebase.google.com/"
                  className="text-brand-600 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Firebase Console
                </Link>{" "}
                and create or select a project.
              </li>
              <li>
                Go to <strong>Project Settings → General → Your apps</strong>{" "}
                and register a Web app. Copy the config values into{" "}
                <code>.env.local</code>.
              </li>
              <li>
                Go to <strong>Build → Authentication → Sign-in method</strong>{" "}
                and enable <strong>Email/Password</strong> and{" "}
                <strong>Google</strong>.
              </li>
              <li>
                For Google sign-in, add your domain (e.g.{" "}
                <code>localhost</code>) under authorized domains in
                Authentication settings.
              </li>
              <li>
                Go to <strong>Build → Firestore Database</strong>, create a
                database, and deploy the rules from{" "}
                <code>firestore/firestore.rules</code>.
              </li>
            </ol>
          </div>

          <div>
            <p className="mb-2 font-semibold text-slate-900">
              Required environment variables
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
              <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
              <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
              <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

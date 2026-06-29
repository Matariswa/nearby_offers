export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const envKeys = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
  measurementId: "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
} as const;

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getFirebaseConfig(): FirebaseEnvConfig {
  return {
    apiKey: readEnv(envKeys.apiKey) ?? "",
    authDomain: readEnv(envKeys.authDomain) ?? "",
    projectId: readEnv(envKeys.projectId) ?? "",
    storageBucket: readEnv(envKeys.storageBucket) ?? "",
    messagingSenderId: readEnv(envKeys.messagingSenderId) ?? "",
    appId: readEnv(envKeys.appId) ?? "",
    measurementId: readEnv(envKeys.measurementId),
  };
}

export function isFirebaseConfigured(config: FirebaseEnvConfig): boolean {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.messagingSenderId &&
      config.appId,
  );
}

export function assertFirebaseConfigured(config: FirebaseEnvConfig): void {
  if (isFirebaseConfigured(config)) {
    return;
  }

  const missing = Object.entries(envKeys)
    .filter(([configKey]) => {
      if (configKey === "measurementId") {
        return false;
      }

      return !config[configKey as keyof FirebaseEnvConfig];
    })
    .map(([, envName]) => envName);

  throw new Error(
    `Firebase is not configured. Missing environment variables: ${missing.join(", ")}`,
  );
}

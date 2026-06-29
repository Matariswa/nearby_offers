import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  assertFirebaseConfigured,
  getFirebaseConfig,
  isFirebaseConfigured,
} from "@/firebase/config";

let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;
let firebaseDb: Firestore | undefined;
let firebaseStorage: FirebaseStorage | undefined;

function createFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  const config = getFirebaseConfig();

  if (process.env.NODE_ENV === "development" && !isFirebaseConfigured(config)) {
    console.warn(
      "[Firebase] Environment variables are missing. Copy .env.example to .env.local and add your Firebase credentials.",
    );
  }

  assertFirebaseConfigured(config);

  return initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
    measurementId: config.measurementId,
  });
}

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = createFirebaseApp();
  }

  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }

  return firebaseAuth;
}

export function getFirebaseDb(): Firestore {
  if (!firebaseDb) {
    firebaseDb = getFirestore(getFirebaseApp());
  }

  return firebaseDb;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!firebaseStorage) {
    firebaseStorage = getStorage(getFirebaseApp());
  }

  return firebaseStorage;
}

export default getFirebaseApp;

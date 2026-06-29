import type { FirestoreTimestamp, SerializedTimestamp } from "@/types/common";
import { Timestamp } from "firebase/firestore";

export function toDate(value: FirestoreTimestamp | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
}

export function toTimestamp(value: Date): Timestamp {
  return Timestamp.fromDate(value);
}

export function toIsoString(
  value: FirestoreTimestamp | null | undefined,
): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

export function serializeTimestamp(
  value: FirestoreTimestamp | null | undefined,
): SerializedTimestamp | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

export function nowTimestamp(): Timestamp {
  return Timestamp.now();
}

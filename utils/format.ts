export function formatDate(
  date: Date,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatDateTime(date: Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatTime(date: Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeDate(date: Date, locale = "en-US"): string {
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, "day");
  }

  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, "hour");
  }

  const diffMinutes = Math.round(diffMs / (1000 * 60));
  return rtf.format(diffMinutes, "minute");
}

export function capitalize(str: string): string {
  if (!str) {
    return str;
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}

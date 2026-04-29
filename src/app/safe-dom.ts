const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;

export function normalizeDisplayString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const cleaned = value.replace(CONTROL_CHARS_REGEX, "").trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

export function escapeHtml(value: unknown): string {
  const text = normalizeDisplayString(String(value ?? ""));
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

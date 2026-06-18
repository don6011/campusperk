export type LinkValidationStatus = "unchecked" | "valid" | "warning" | "invalid";

export type LinkValidationResult = {
  status: LinkValidationStatus;
  message: string;
};

export function normalizeAdminUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function validateAffiliateUrl(value: string): LinkValidationResult {
  const normalized = normalizeAdminUrl(value);
  if (!normalized) {
    return {
      status: "warning",
      message: "Affiliate URL missing. Redirects will need a deal override or merchant default before launch.",
    };
  }

  try {
    const parsed = new URL(normalized);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { status: "invalid", message: "Only HTTP and HTTPS affiliate links are supported." };
    }
    return { status: "valid", message: "Affiliate link format looks valid." };
  } catch {
    return { status: "invalid", message: "Affiliate URL is malformed." };
  }
}

export function parseTrackingParameters(value: string): Record<string, unknown> {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Tracking parameters must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function stringifyTrackingParameters(value: unknown) {
  if (!value || typeof value !== "object") return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

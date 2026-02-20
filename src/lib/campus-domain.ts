/**
 * Normalize an email address to extract the root campus domain.
 * Strips common subdomains like student., alumni., mail., etc.
 */
const SUBDOMAIN_PREFIXES = new Set([
  "student", "students", "alumni", "mail", "my", "email",
  "stu", "stud", "e", "m", "webmail", "outlook", "live",
  "connect", "go", "g",
]);

export function normalizeCampusDomain(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const parts = domain.split(".");

  if (parts.length > 2 && SUBDOMAIN_PREFIXES.has(parts[0])) {
    return parts.slice(1).join(".");
  }
  return domain;
}

export function isEduDomain(domain: string): boolean {
  return domain.endsWith(".edu");
}

/**
 * Compute verification strength score on client side.
 * .edu email → +50, domain approved → +20, admin verified → +30, proof uploaded → +20
 */
export function computeVerificationScore(opts: {
  hasEdu: boolean;
  domainApproved: boolean;
  adminVerified: boolean;
  hasProof: boolean;
}): number {
  return (
    (opts.hasEdu ? 50 : 0) +
    (opts.domainApproved ? 20 : 0) +
    (opts.adminVerified ? 30 : 0) +
    (opts.hasProof ? 20 : 0)
  );
}

export function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "High Trust", color: "text-accent" };
  if (score >= 60) return { label: "Verified", color: "text-primary" };
  return { label: "Limited Access", color: "text-gold" };
}

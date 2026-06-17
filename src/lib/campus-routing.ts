type CampusProfileLike = {
  campus_id?: string | null;
  campus_slug?: string | null;
  campus_name?: string | null;
  campus_domain?: string | null;
  campus_city?: string | null;
  campus_state?: string | null;
};

const campusSlugAliases: Array<{ slug: string; matches: string[] }> = [
  {
    slug: "uagc",
    matches: ["uagc", "uagc.edu", "university of arizona global campus", "global campus"],
  },
  {
    slug: "arizona-state",
    matches: ["asu", "asu.edu", "arizona state", "arizona state university"],
  },
  {
    slug: "ole-miss",
    matches: ["ole miss", "olemiss", "olemiss.edu", "university of mississippi"],
  },
];

export function slugifyCampus(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCampusSlugFromParts(parts: Array<string | null | undefined>) {
  const normalized = parts
    .filter(Boolean)
    .map((part) => String(part).trim().toLowerCase())
    .filter(Boolean);

  const alias = campusSlugAliases.find((entry) =>
    normalized.some((part) => entry.matches.some((match) => part.includes(match)))
  );
  if (alias) return alias.slug;

  const primary = normalized[0];
  return primary ? slugifyCampus(primary.replace(/\.edu$/, "")) : null;
}

export function getProfileCampusSlug(profile?: CampusProfileLike | null) {
  if (!profile) return null;
  if (profile.campus_slug) return slugifyCampus(profile.campus_slug);
  return getCampusSlugFromParts([
    profile.campus_domain,
    profile.campus_name,
    profile.campus_city && profile.campus_state ? `${profile.campus_city} ${profile.campus_state}` : null,
  ]);
}

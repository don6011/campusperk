import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getProfileCampusSlug } from "../src/lib/campus-routing";

type Result = { name: string; passed: boolean; detail?: string };

const root = process.cwd();
const results: Result[] = [];

function check(name: string, passed: boolean, detail?: string) {
  results.push({ name, passed, detail });
}

function file(path: string) {
  return readFileSync(join(root, path), "utf8");
}

check(
  "UAGC verified user routes to /campus/uagc",
  getProfileCampusSlug({ campus_id: "uagc-id", campus_slug: "uagc", campus_name: "Old School" }) === "uagc"
);

check(
  "ASU verified user routes to canonical ASU slug",
  getProfileCampusSlug({ campus_id: "asu-id", campus_slug: "arizona-state", campus_domain: "asu.edu" }) === "arizona-state"
);

check(
  "User with no campus routes to selection",
  getProfileCampusSlug({ campus_id: null, campus_slug: null, campus_name: null, campus_domain: null }) === null
);

check(
  "Stale campus_name does not override campus_id/campus_slug",
  getProfileCampusSlug({ campus_id: "asu-id", campus_slug: "arizona-state", campus_name: "University of Arizona Global Campus" }) === "arizona-state"
);

const redirect = file("src/pages/CampusRedirect.tsx");
check(
  "/campus smart route reads campus_id first",
  redirect.includes("profile?.campus_id") && redirect.includes("campus_domains") && redirect.includes("campus_slug")
);
check(
  "/campus without campus_id falls back to selection",
  redirect.includes('Navigate to="/campus/select"')
);

const hub = file("src/pages/CampusHub.tsx");
check(
  "/campus/:wrong-slug shows Viewing another campus state",
  hub.includes("Viewing another campus") && hub.includes("Go to My Campus") && hub.includes("profile.campus_id !== campus.id")
);

const selection = file("src/pages/CampusSelection.tsx");
check(
  "Campus selection assigns only through trusted RPC",
  selection.includes('rpc("assign_user_campus"') && selection.includes("Browse only")
);

const migration = file("supabase/migrations/20260615120000_campus_assignment_hardening.sql");
check(
  "Trusted assign_user_campus RPC exists",
  migration.includes("CREATE OR REPLACE FUNCTION public.assign_user_campus")
);
check(
  "RPC derives campus from verified email domain",
  migration.includes("public.normalize_campus_domain") && migration.includes("domain_mismatch")
);
check(
  "Campus slug stored on campus record",
  migration.includes("ALTER TABLE public.campus_domains") && migration.includes("campus_slug")
);

const failures = results.filter((result) => !result.passed);
for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}${result.detail ? ` - ${result.detail}` : ""}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}

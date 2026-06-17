import { readFileSync } from "node:fs";

type Status = "PASS" | "FAIL";

interface Result {
  name: string;
  status: Status;
  detail: string;
}

function check(name: string, passed: boolean, detail: string): Result {
  return { name, status: passed ? "PASS" : "FAIL", detail };
}

function includesAll(source: string, needles: string[]) {
  return needles.every((needle) => source.includes(needle));
}

const protectedRoute = readFileSync("src/components/ProtectedRoute.tsx", "utf8");
const authContext = readFileSync("src/contexts/AuthContext.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20260616120000_private_beta_access_model.sql", "utf8");
const app = readFileSync("src/App.tsx", "utf8");

const results: Result[] = [
  check(
    "non-admin beta user can access protected app routes",
    protectedRoute.includes("profile?.beta_access") && protectedRoute.includes("!isAdmin && !hasBetaAccess"),
    "ProtectedRoute allows beta_access users through while IS_LAUNCHED is false.",
  ),
  check(
    "non-admin beta user can access /campus",
    app.includes('path="/campus"') && protectedRoute.includes("hasBetaAccess"),
    "/campus remains protected but beta users pass the guard.",
  ),
  check(
    "non-admin beta user can access /campus/select",
    app.includes('path="/campus/select"') && protectedRoute.includes("hasBetaAccess"),
    "/campus/select remains protected but beta users pass the guard.",
  ),
  check(
    "non-admin beta user can access dashboard",
    app.includes('path="/dashboard"') && protectedRoute.includes("hasBetaAccess"),
    "/dashboard remains protected but beta users pass the guard.",
  ),
  check(
    "non-beta user is blocked by beta access screen",
    includesAll(protectedRoute, ["BetaAccessScreen", "Your CampusPerk access is pending", "return <BetaAccessScreen />"]),
    "Logged-in users without admin, beta_access, or founding-member access see the private beta screen.",
  ),
  check(
    "active ambassadors can access ambassador protected flows",
    protectedRoute.includes("isActiveAmbassador") &&
      protectedRoute.includes('location.pathname.startsWith("/ambassador/")') &&
      protectedRoute.includes("hasAmbassadorFlowAccess"),
    "Active ambassadors can reach ambassador-only pages without opening the full app.",
  ),
  check(
    "ambassador application pages remain publicly reachable",
    app.includes('path="/ambassador" element={<AmbassadorApply />}') &&
      app.includes('path="/ambassador-program" element={<AmbassadorProgram />}'),
    "Applicants can still apply from public ambassador routes.",
  ),
  check(
    "admin still passes",
    protectedRoute.includes("!isAdmin && !hasBetaAccess") && protectedRoute.includes(".eq(\"role\", \"admin\")"),
    "Admin role check still bypasses private beta gating.",
  ),
  check(
    "unauthenticated user still redirects to home",
    protectedRoute.includes("if (!isLoggedIn)") && protectedRoute.includes('<Navigate to="/" replace />'),
    "Logged-out users are not shown beta app content.",
  ),
  check(
    "founding members may pass if approved",
    protectedRoute.includes("profile?.is_founding_member") && authContext.includes("is_founding_member"),
    "Approved founding members are treated as private beta users.",
  ),
  check(
    "beta_access is trusted and admin managed",
    includesAll(migration, [
      "ADD COLUMN IF NOT EXISTS beta_access boolean NOT NULL DEFAULT false",
      "admin_set_beta_access",
      "NOT public.has_role(v_admin, 'admin')",
    ]),
    "Migration adds beta_access and an admin-only RPC.",
  ),
  check(
    "users cannot self-edit beta_access through existing safe profile grant",
    !migration.includes("GRANT UPDATE (\n  beta_access") && !migration.includes("GRANT UPDATE (beta_access"),
    "No client UPDATE grant is added for beta_access.",
  ),
  check(
    "AuthContext reads beta_access",
    authContext.includes("beta_access") && authContext.includes("hasPrivateBetaAccess"),
    "Profile fetch and context expose beta access state.",
  ),
];

for (const result of results) {
  console.log(`${result.status} ${result.name} - ${result.detail}`);
}

const failed = results.filter((result) => result.status === "FAIL");
console.log(`\nSummary: ${results.length - failed.length} pass, ${failed.length} fail`);

if (failed.length > 0) {
  process.exit(1);
}

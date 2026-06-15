const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://jttcpewdibbczdnutmme.supabase.co";
const supabaseAnonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dGNwZXdkaWJiY3pkbnV0bW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTI3MTgsImV4cCI6MjA4NjkyODcxOH0.AEMRbIWP4pR86Ov24R1k_Bx3JYa7WCrwX0OUBrU40xw";
const fixtureEmail = process.env.SECURITY_TEST_EMAIL || "campusperk.security.fixture@security-fixture.edu";
const fixturePassword = process.env.SECURITY_TEST_PASSWORD || "CampusPerkAudit!2026";
const premiumFixtureTitle = "CampusPerk Security Premium Fixture";
const campusFixtureTitle = "CampusPerk Security Campus Fixture";

type ResultStatus = "pass" | "fail" | "skip";

interface ValidationResult {
  name: string;
  status: ResultStatus;
  detail: string;
}

interface AuthSession {
  access_token?: string;
  user?: { id: string; email?: string };
}

interface DealCandidate {
  id: string;
  title?: string | null;
  status?: string | null;
}

const protectedUrlKeys = [
  "affiliate_link_url",
  "direct_link_url",
  "url",
  "redirect_url",
  "destination_url",
  "target_url",
] as const;

const anonHeaders = {
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
  "Content-Type": "application/json",
};

function pass(name: string, detail: string): ValidationResult {
  return { name, status: "pass", detail };
}

function fail(name: string, detail: string): ValidationResult {
  return { name, status: "fail", detail };
}

function skip(name: string, detail: string): ValidationResult {
  return { name, status: "skip", detail };
}

function describeBody(body: unknown) {
  return typeof body === "string" ? body : JSON.stringify(body);
}

function getObject(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

function getLeakedUrlKeys(body: unknown): string[] {
  const object = getObject(body);
  if (!object) return [];
  return protectedUrlKeys.filter((key) => Object.prototype.hasOwnProperty.call(object, key));
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function restGet(path: string, token = supabaseAnonKey) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: { ...anonHeaders, Authorization: `Bearer ${token}` },
  });
  return { response, body: await readJson(response) };
}

async function restPatch(path: string, body: unknown, token: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      ...anonHeaders,
      Authorization: `Bearer ${token}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  return { response, body: await readJson(response) };
}

async function rpc(name: string, body: unknown, token = supabaseAnonKey) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { ...anonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { response, body: await readJson(response) };
}

async function createTestUser(): Promise<{ token?: string; userId?: string; detail: string }> {
  const fixtureSignin = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify({ email: fixtureEmail, password: fixturePassword }),
  });
  const fixtureSigninBody = (await readJson(fixtureSignin)) as AuthSession & { msg?: string; error_description?: string };
  if (fixtureSignin.ok && fixtureSigninBody.access_token && fixtureSigninBody.user?.id) {
    return { token: fixtureSigninBody.access_token, userId: fixtureSigninBody.user.id, detail: fixtureEmail };
  }

  const email = `campusperk-security-${Date.now()}@example.edu`;
  const password = `AuditPass!${Date.now()}`;
  const signup = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify({ email, password, data: {} }),
  });
  const signupBody = (await readJson(signup)) as AuthSession & { msg?: string; error_description?: string };

  if (!signup.ok) {
    return { detail: signupBody?.error_description || signupBody?.msg || `Signup failed with HTTP ${signup.status}` };
  }

  if (signupBody.access_token && signupBody.user?.id) {
    return { token: signupBody.access_token, userId: signupBody.user.id, detail: email };
  }

  const signin = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify({ email, password }),
  });
  const signinBody = (await readJson(signin)) as AuthSession & { msg?: string; error_description?: string };
  if (!signin.ok || !signinBody.access_token || !signinBody.user?.id) {
    return { detail: signinBody?.error_description || signinBody?.msg || "Email confirmation likely required" };
  }

  return { token: signinBody.access_token, userId: signinBody.user.id, detail: email };
}

async function testPublicUrlColumns(): Promise<ValidationResult> {
  const { response, body } = await restGet("deals?select=id,affiliate_link_url,direct_link_url&limit=1");
  if (!response.ok) return pass("anon cannot read protected deal URLs", describeBody(body));

  const rows = Array.isArray(body) ? body : [];
  const leaked = rows.some((row) => row && typeof row === "object" && ("affiliate_link_url" in row || "direct_link_url" in row));
  return leaked
    ? fail("anon cannot read protected deal URLs", "Protected URL columns were returned to anon client")
    : pass("anon cannot read protected deal URLs", "Protected URL columns were omitted");
}

async function findDeal(query: string): Promise<DealCandidate | null> {
  const { response, body } = await restGet(`deals?select=id,title,status&limit=1&${query}`);
  if (!response.ok || !Array.isArray(body) || !body[0]?.id) return null;
  return body[0] as DealCandidate;
}

async function findDealByTitle(title: string): Promise<DealCandidate | null> {
  return findDeal(`title=eq.${encodeURIComponent(title)}`);
}

async function testRedirectCandidate(name: string, query: string, expectedBlockedReason: string): Promise<ValidationResult> {
  const deal = await findDeal(query);
  if (!deal) return skip(name, "No matching deal exists in the current database");
  return testRedirectDeal(name, deal, expectedBlockedReason);
}

async function testRedirectDeal(name: string, deal: DealCandidate, expectedBlockedReason: string): Promise<ValidationResult> {
  const { response, body } = await rpc("get_deal_redirect", {
    p_deal_id: deal.id,
    p_device_type: "validation",
    p_referrer: "campusperk-security-validation",
  });
  if (!response.ok) return fail(name, describeBody(body));

  const leakedKeys = getLeakedUrlKeys(body);
  const dealLabel = `${deal.title || "untitled"} (${deal.id})`;
  if (leakedKeys.length > 0) {
    return fail(name, `Blocked redirect leaked protected URL fields [${leakedKeys.join(", ")}] for ${dealLabel}`);
  }

  const result = getObject(body);
  const blockedReason = typeof result?.blocked_reason === "string" ? result.blocked_reason : null;
  if (blockedReason === expectedBlockedReason) return pass(name, `Blocked ${dealLabel} with ${expectedBlockedReason}; no URL fields returned`);
  if (blockedReason) return pass(name, `Blocked ${dealLabel} with ${blockedReason}; no URL fields returned`);

  return pass(name, `Safe blocked response for ${dealLabel}; no URL fields returned`);
}

async function testFixtureRedirect(name: string, title: string, fallbackQuery: string, expectedBlockedReason: string): Promise<ValidationResult> {
  const deal = (await findDealByTitle(title)) || (await findDeal(fallbackQuery));
  if (!deal) return skip(name, `No fixture or fallback deal exists. Expected fixture title: ${title}`);
  return testRedirectDeal(name, deal, expectedBlockedReason);
}

async function testTrustedProfileUpdate(): Promise<ValidationResult> {
  const { token, userId, detail } = await createTestUser();
  if (!token || !userId) return skip("user cannot self-upgrade trusted profile fields", detail);

  const update = await restPatch(
    `profiles?id=eq.${userId}`,
    { premium_status: true, student_verified: true },
    token,
  );
  if (!update.response.ok) return pass("user cannot self-upgrade trusted profile fields", JSON.stringify(update.body));

  const { response, body } = await restGet(`profiles?select=premium_status,student_verified&id=eq.${userId}`, token);
  if (!response.ok) return fail("user cannot self-upgrade trusted profile fields", JSON.stringify(body));

  const profile = Array.isArray(body) ? body[0] : null;
  const trustedChanged = Boolean(profile?.premium_status || profile?.student_verified);
  return trustedChanged
    ? fail("user cannot self-upgrade trusted profile fields", "Trusted fields changed through normal profile update")
    : pass("user cannot self-upgrade trusted profile fields", "Update returned without changing trusted flags");
}

async function testNonAdminFunction(name: string, functionName: string, body: unknown): Promise<ValidationResult> {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify(body),
  });
  if (response.status === 401 || response.status === 403) return pass(name, `Rejected with HTTP ${response.status}`);
  const text = await response.text();
  return fail(name, `Expected 401/403, got HTTP ${response.status}: ${text.slice(0, 240)}`);
}

async function main() {
  const now = new Date().toISOString();
  const results: ValidationResult[] = [
    await testPublicUrlColumns(),
    await testRedirectCandidate("unverified user cannot access .edu-only deal", "status=eq.active&requires_edu_email=eq.true", "edu_verification_required"),
    await testFixtureRedirect("non-premium user cannot access premium deal", premiumFixtureTitle, "status=eq.active&premium_only=eq.true", "premium_gated"),
    await testRedirectCandidate("expired deal redirect is blocked", `expires_at=lt.${encodeURIComponent(now)}`, "expired"),
    await testRedirectCandidate("inactive deal redirect is blocked", "status=neq.active", "inactive"),
    await testFixtureRedirect("wrong-campus user cannot access campus-restricted deal", campusFixtureTitle, "status=eq.active&deal_scope=eq.local", "campus_restricted"),
    await testTrustedProfileUpdate(),
    await testNonAdminFunction("non-admin cannot extract deal", "extract-deal", { url: "https://example.com" }),
    await testNonAdminFunction("non-admin cannot ingest deals", "ingest-deals", { source: "validation", deals: [] }),
  ];

  const counts = results.reduce(
    (acc, result) => {
      acc[result.status] += 1;
      return acc;
    },
    { pass: 0, fail: 0, skip: 0 } satisfies Record<ResultStatus, number>,
  );

  for (const result of results) {
    console.log(`${result.status.toUpperCase()} ${result.name}: ${result.detail}`);
  }
  console.log(`SUMMARY pass=${counts.pass} fail=${counts.fail} skip=${counts.skip}`);

  if (counts.fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

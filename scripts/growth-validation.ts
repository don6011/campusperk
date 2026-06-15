const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://jttcpewdibbczdnutmme.supabase.co";
const supabaseAnonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJqdHRjcGV3ZGliYmN6ZG51dG1tZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzcxMzUyNzE4LCJleHAiOjIwODY5Mjg3MTh9.AEMRbIWP4pR86Ov24R1k_Bx3JYa7WCrwX0OUBrU40xw";

type ResultStatus = "pass" | "fail" | "blocked";

interface ValidationResult {
  flow: string;
  status: ResultStatus;
  detail: string;
}

interface AuthSession {
  access_token?: string;
  user?: { id: string; email?: string };
  error_description?: string;
  msg?: string;
}

interface AmbassadorRecord {
  id: string;
  user_id: string;
  university: string;
  referral_code: string;
  status: string;
}

interface MerchantApprovalResult {
  partner_id?: string;
  offer_id?: string;
}

const runId = Date.now();
const validationEmail = `campusperk.growth.${runId}@asu.edu`;
const validationPassword = `GrowthPass!${runId}`;
const validationName = `Growth Fixture ${runId}`;
const validationUniversity = "CampusPerk Growth Validation University";
const validationReferralCode = `GROWTH${String(runId).slice(-8)}`;
const adminToken = process.env.GROWTH_ADMIN_ACCESS_TOKEN || "";

const anonHeaders = {
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
  "Content-Type": "application/json",
};

function pass(flow: string, detail: string): ValidationResult {
  return { flow, status: "pass", detail };
}

function fail(flow: string, detail: string): ValidationResult {
  return { flow, status: "fail", detail };
}

function blocked(flow: string, detail: string): ValidationResult {
  return { flow, status: "blocked", detail };
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

function describe(body: unknown) {
  return typeof body === "string" ? body : JSON.stringify(body);
}

function firstRow<T>(body: unknown): T | null {
  return Array.isArray(body) && body.length > 0 ? (body[0] as T) : null;
}

async function rpc<TBody extends Record<string, unknown>>(
  functionName: string,
  body: TBody,
  token = supabaseAnonKey
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { response, body: await readJson(response) };
}

async function rest(path: string, init: RequestInit = {}, token = supabaseAnonKey, representation = false) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: representation ? "return=representation" : "return=minimal",
      ...(init.headers || {}),
    },
  });
  return { response, body: await readJson(response) };
}

async function signUp() {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify({
      email: validationEmail,
      password: validationPassword,
      data: { name: validationName },
      gotrue_meta_security: {},
    }),
  });
  return { response, body: (await readJson(response)) as AuthSession };
}

async function signIn(email: string, password: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify({ email, password }),
  });
  return { response, body: (await readJson(response)) as AuthSession };
}

async function getPublicReferralCode(): Promise<string | null> {
  const { response, body } = await rest("ambassadors?select=referral_code,status&status=eq.active&limit=1", {}, supabaseAnonKey, true);
  if (!response.ok) return null;
  const row = firstRow<{ referral_code?: string }>(body);
  return row?.referral_code || null;
}

async function createAmbassadorFixture(userId: string): Promise<AmbassadorRecord> {
  const existing = await rest(
    `ambassadors?select=id,user_id,university,referral_code,status&user_id=eq.${userId}&status=eq.active&limit=1`,
    {},
    adminToken,
    true
  );
  const existingAmbassador = firstRow<AmbassadorRecord>(existing.body);
  if (existing.response.ok && existingAmbassador) return existingAmbassador;

  const inserted = await rest(
    "ambassadors",
    {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        university: validationUniversity,
        referral_code: validationReferralCode,
        status: "active",
        approved_at: new Date().toISOString(),
      }),
    },
    adminToken,
    true
  );
  if (!inserted.response.ok) {
    throw new Error(`Could not create ambassador fixture: ${describe(inserted.body)}`);
  }
  const ambassador = firstRow<AmbassadorRecord>(inserted.body);
  if (!ambassador) throw new Error("Ambassador fixture insert returned no row.");
  return ambassador;
}

async function seedRewardInputs(referralCode: string, referredUserId: string) {
  for (let index = 0; index < 3; index += 1) {
    await rpc("record_ambassador_referral", {
      p_referral_code: referralCode,
      p_referred_user_id: referredUserId,
      p_event: "verified_signup",
      p_source_path: `/growth-validation/reward-${index}`,
    });
    await rpc("create_founding_member_reservation", {
      p_email: `founder.${runId}.${index}@asu.edu`,
      p_name: `Founder Fixture ${index}`,
      p_campus: validationUniversity,
      p_referral_code: referralCode,
    });
    await rpc("submit_merchant_deal", {
      p_business_name: `CampusPerk Reward Merchant ${runId}-${index}`,
      p_contact_email: `reward.merchant.${runId}.${index}@example.com`,
      p_offer_title: "Reward fixture student deal",
      p_contact_name: "Reward Fixture",
      p_contact_phone: null,
      p_website_url: "https://example.com/reward-fixture",
      p_city: "Tempe",
      p_state: "AZ",
      p_category: "Food & Dining",
      p_offer_description: "Reward validation merchant lead.",
      p_discount_value: "10%",
      p_redemption_instructions: "Show student ID.",
      p_expires_at: null,
      p_sponsored_interest: false,
      p_monthly_budget_cents: null,
      p_campus_target: validationUniversity,
      p_proof_url: null,
      p_referral_code: referralCode,
    });
  }
}

function adminInstructions() {
  return [
    "Missing GROWTH_ADMIN_ACCESS_TOKEN.",
    "Generate one by signing into Campus Perk as an admin user, then copy the current Supabase access token from the browser session.",
    "PowerShell example:",
    "$env:GROWTH_ADMIN_ACCESS_TOKEN='<admin-user-access-token>'; $env:NODE_TLS_REJECT_UNAUTHORIZED='0'; bun run test:growth",
    "For Supabase type generation, also run:",
    "$env:SUPABASE_ACCESS_TOKEN='<supabase-personal-access-token>'; & 'C:\\Program Files\\nodejs\\npx.cmd' supabase gen types typescript --project-id jttcpewdibbczdnutmme | Set-Content -Path src\\integrations\\supabase\\types.ts",
  ].join(" ");
}

async function main() {
  const results: ValidationResult[] = [];

  const fixtureSignin = await signIn(
    process.env.SECURITY_TEST_EMAIL || "campusperk.security.fixture@security-fixture.edu",
    process.env.SECURITY_TEST_PASSWORD || "CampusPerkAudit!2026"
  );

  let ambassadorFixture: AmbassadorRecord | null = null;
  if (adminToken && fixtureSignin.response.ok && fixtureSignin.body.user?.id) {
    try {
      ambassadorFixture = await createAmbassadorFixture(fixtureSignin.body.user.id);
    } catch (error) {
      results.push(fail("Active ambassador fixture", error instanceof Error ? error.message : String(error)));
    }
  } else if (!adminToken) {
    results.push(blocked("Active ambassador fixture", adminInstructions()));
  } else {
    results.push(fail("Active ambassador fixture", `Could not sign in fixture user: ${describe(fixtureSignin.body)}`));
  }

  const publicReferralCode = await getPublicReferralCode();
  const referralCode = ambassadorFixture?.referral_code || publicReferralCode || validationReferralCode;
  results.push(
    publicReferralCode
      ? pass("Public referral code", `Public active referral code available: ${publicReferralCode}`)
      : fail("Public referral code", "No active ambassador referral_code is visible to public clients.")
  );

  const signup = await signUp();
  let validationUserId = signup.body.user?.id || null;
  let signupDetail = "Signup accepted";
  if (!signup.response.ok || !validationUserId) {
    if (fixtureSignin.response.ok && fixtureSignin.body.user?.id) {
      validationUserId = fixtureSignin.body.user.id;
      signupDetail = `Auth signup endpoint returned ${describe(signup.body)}; used confirmed fixture user ${validationUserId}`;
    } else {
      results.push(fail("1. Signup with referral code", describe(signup.body)));
    }
  }

  if (validationUserId) {
    const signupReferral = await rpc("record_ambassador_referral", {
      p_referral_code: referralCode,
      p_referred_user_id: validationUserId,
      p_event: "signup_started",
      p_source_path: "/sign-up",
    });
    results.push(
      signupReferral.response.ok
        ? pass("1. Signup with referral code", `${signupDetail}; referral event recorded: ${describe(signupReferral.body)}`)
        : fail("1. Signup with referral code", describe(signupReferral.body))
    );
  }

  const founding = await rpc("create_founding_member_reservation", {
    p_email: validationEmail,
    p_name: validationName,
      p_campus: validationUniversity,
      p_referral_code: referralCode,
    });
  results.push(
    founding.response.ok
      ? pass("2. Founding member reservation", `Reservation created: ${describe(founding.body)}`)
      : fail("2. Founding member reservation", describe(founding.body))
  );

  const ambassadorApplication = await rest(
    "ambassador_applications",
    {
      method: "POST",
      body: JSON.stringify({
        user_id: validationUserId,
        name: validationName,
        email: validationEmail,
        university: validationUniversity,
        social_handle: "@campusperkgrowthfixture",
        role: "student",
        motivation_text: "Growth validation fixture for ambassador onboarding.",
        graduation_year: 2027,
        source: "growth_validation",
      }),
    },
    supabaseAnonKey
  );
  results.push(
    ambassadorApplication.response.ok
      ? pass("3. Ambassador application", "Application insert accepted.")
      : fail("3. Ambassador application", describe(ambassadorApplication.body))
  );

  if (adminToken && validationUserId) {
    const applicationLookup = await rest(
      `ambassador_applications?select=id,email,status&email=eq.${encodeURIComponent(validationEmail)}&order=created_at.desc&limit=1`,
      {},
      adminToken,
      true
    );
    const application = firstRow<{ id: string }>(applicationLookup.body);
    if (!applicationLookup.response.ok || !application) {
      results.push(fail("4. Ambassador approval", `Could not find application: ${describe(applicationLookup.body)}`));
    } else {
      const updateApplication = await rest(
        `ambassador_applications?id=eq.${application.id}`,
        { method: "PATCH", body: JSON.stringify({ status: "approved" }) },
        adminToken
      );
      const newAmbassador = await rest(
        "ambassadors",
        {
          method: "POST",
          body: JSON.stringify({
            user_id: validationUserId,
            university: validationUniversity,
            referral_code: `APP${String(runId).slice(-9)}`,
            status: "active",
            approved_at: new Date().toISOString(),
          }),
        },
        adminToken,
        true
      );
      results.push(
        updateApplication.response.ok && newAmbassador.response.ok
          ? pass("4. Ambassador approval", "Application approved and active ambassador record created.")
          : fail("4. Ambassador approval", `Update: ${describe(updateApplication.body)} Insert: ${describe(newAmbassador.body)}`)
      );
    }
  } else {
    results.push(blocked("4. Ambassador approval", adminInstructions()));
  }

  if (ambassadorFixture && fixtureSignin.body.access_token) {
    await seedRewardInputs(ambassadorFixture.referral_code, ambassadorFixture.user_id);
    const dashboard = await rest(
      `ambassadors?select=id,referral_code,university,status,reward_balance_cents&user_id=eq.${ambassadorFixture.user_id}&status=eq.active&limit=1`,
      {},
      fixtureSignin.body.access_token,
      true
    );
    const dashboardAmbassador = firstRow<AmbassadorRecord>(dashboard.body);
    results.push(
      dashboard.response.ok && dashboardAmbassador
        ? pass("5. Ambassador dashboard metrics", `Authenticated ambassador can read dashboard record ${dashboardAmbassador.referral_code}.`)
        : fail("5. Ambassador dashboard metrics", describe(dashboard.body))
    );

    const rewards = await rpc("refresh_ambassador_rewards", { p_ambassador_id: ambassadorFixture.id }, fixtureSignin.body.access_token);
    const rewardRows = await rest(
      `ambassador_reward_unlocks?select=reward_key,reward_label,current_value&ambassador_id=eq.${ambassadorFixture.id}`,
      {},
      fixtureSignin.body.access_token,
      true
    );
    results.push(
      rewards.response.ok && Array.isArray(rewardRows.body) && rewardRows.body.length > 0
        ? pass("6. Reward unlocks", `Reward refresh created/read ${rewardRows.body.length} unlock row(s).`)
        : fail("6. Reward unlocks", `Refresh: ${describe(rewards.body)} Rows: ${describe(rewardRows.body)}`)
    );
  } else {
    results.push(blocked("5. Ambassador dashboard metrics", "Requires admin-created active ambassador fixture and fixture user sign-in."));
    results.push(blocked("6. Reward unlocks", "Requires active ambassador fixture."));
  }

  const merchant = await rpc("submit_merchant_deal", {
    p_business_name: `CampusPerk Growth Merchant ${runId}`,
    p_contact_email: `merchant.${runId}@example.com`,
    p_offer_title: "20% off for students",
    p_contact_name: "Growth Merchant",
    p_contact_phone: "555-0100",
    p_website_url: "https://example.com/campusperk-growth-merchant",
    p_city: "Tempe",
    p_state: "AZ",
    p_category: "Food & Dining",
    p_offer_description: "Validation fixture merchant offer.",
    p_discount_value: "20%",
    p_redemption_instructions: "Show student ID.",
    p_expires_at: null,
    p_sponsored_interest: true,
    p_monthly_budget_cents: 25000,
    p_campus_target: validationUniversity,
    p_proof_url: "https://example.com/proof",
    p_referral_code: referralCode,
  });
  results.push(
    merchant.response.ok
      ? pass("7. Merchant submission", `Merchant submission created: ${describe(merchant.body)}`)
      : fail("7. Merchant submission", describe(merchant.body))
  );
  results.push(
    merchant.response.ok
      ? pass("10. Sponsored placement lead capture", "Sponsored interest and monthly budget were accepted by submit_merchant_deal.")
      : fail("10. Sponsored placement lead capture", "Sponsored lead capture depends on merchant submission.")
  );

  if (adminToken && merchant.response.ok) {
    const approval = await rpc("approve_merchant_submission", { p_submission_id: merchant.body }, adminToken);
    const approvalResult = approval.body as MerchantApprovalResult | null;
    results.push(
      approval.response.ok
        ? pass("8. Merchant approval", `Approval RPC accepted: ${describe(approval.body)}`)
        : fail("8. Merchant approval", describe(approval.body))
    );

    const partnerId = approvalResult?.partner_id;
    const offerId = approvalResult?.offer_id;
    if (partnerId && offerId) {
      const partner = await rest(`partners?select=id,partner_name,status&id=eq.${partnerId}`, {}, adminToken, true);
      const offer = await rest(`partner_offers?select=id,partner_id,status,sponsored,sponsor_tier&id=eq.${offerId}`, {}, adminToken, true);
      const partnerRow = firstRow<{ id: string; status: string }>(partner.body);
      const offerRow = firstRow<{ id: string; status: string }>(offer.body);
      results.push(
        partner.response.ok && offer.response.ok && partnerRow && offerRow?.status === "pending"
          ? pass("9. Partner record creation", `Partner ${partnerId} and pending offer ${offerId} created.`)
          : fail("9. Partner record creation", `Partner: ${describe(partner.body)} Offer: ${describe(offer.body)}`)
      );
    } else {
      results.push(fail("9. Partner record creation", `Approval did not return partner_id and offer_id: ${describe(approval.body)}`));
    }
  } else {
    results.push(blocked("8. Merchant approval", adminInstructions()));
    results.push(blocked("9. Partner record creation", "Depends on merchant approval RPC running as an admin."));
  }

  const passCount = results.filter((result) => result.status === "pass").length;
  const failCount = results.filter((result) => result.status === "fail").length;
  const blockedCount = results.filter((result) => result.status === "blocked").length;

  console.log(`Growth validation summary: PASS ${passCount}, FAIL ${failCount}, BLOCKED ${blockedCount}`);
  console.log(`Fixture email: ${validationEmail}`);
  console.log(`Referral code used: ${referralCode}`);
  for (const result of results) {
    console.log(`${result.status.toUpperCase()} ${result.flow} - ${result.detail}`);
  }

  if (failCount > 0 || blockedCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

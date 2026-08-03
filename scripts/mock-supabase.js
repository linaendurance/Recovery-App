// A fixture server that speaks the handful of Supabase endpoints this app
// actually calls. It exists for ONE reason: to render the signed-in screens in
// a real browser.
//
// WHAT THIS IS NOT: it is not a Supabase emulator and it is not integration
// coverage. It does not enforce RLS, validate JWTs, or run any of the real SQL.
// A test passing here proves the React renders and the data flows through the
// components — nothing about whether the database agrees.
//
// It exists because every crash-level bug in this app so far has lived in the
// loading -> loaded transition, which no unit test, type check or production
// build ever executes. Those are cheap to catch in a browser and invisible
// everywhere else.
//
// Usage: node scripts/mock-supabase.js [port]
const http = require("http");

const PORT = Number(process.argv[2] || 54321);
const USER_ID = "11111111-1111-1111-1111-111111111111";

// Not verified by the client — it only reads the expiry — but it has to be a
// well-formed JWT or supabase-js refuses to parse the session.
function token() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return [
    b64({ alg: "HS256", typ: "JWT" }),
    b64({
      sub: USER_ID,
      role: "authenticated",
      aud: "authenticated",
      email: "demo@recovery-demo.app",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }),
    "signature-not-verified-by-the-client",
  ].join(".");
}

const USER = {
  id: USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "demo@recovery-demo.app",
  user_metadata: { display_name: "Demo", birth_year: "1998" },
  app_metadata: { provider: "email" },
  created_at: "2026-07-18T00:00:00Z",
};

const session = () => ({
  access_token: token(),
  refresh_token: "mock-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: USER,
});

// ---------------------------------------------------------------------------
// Fixtures. Deliberately awkward rather than tidy: a day with a long gap, an
// occasion missing a macro, and one marked as feeling excessive — so the
// screens have to render the branches that only appear in real use.
// ---------------------------------------------------------------------------
const food = (name, group, over = {}) => ({
  id: `food-${name.toLowerCase().replace(/\W+/g, "-")}`,
  name,
  food_group: group,
  portion: 100,
  unit: "g",
  protein: 5,
  carbs: 20,
  fat: 4,
  fibre: 2,
  iron: 1,
  calcium: 50,
  density: "medium",
  deprecated_at: null,
  replaced_by: null,
  ...over,
});

const FOODS = [
  food("Oats, dry", "carbs", { portion: 40, carbs: 56.2, fat: 6.9, protein: 13.2 }),
  food("Milk, whole", "dairy", { portion: 200, unit: "ml", carbs: 4.7, fat: 3.6, protein: 3.3 }),
  food("Banana", "fruit", { portion: 120, carbs: 20.2, fat: 0.3, protein: 1.1 }),
  food("Lettuce", "veg", { portion: 60, carbs: 1.6, fat: 0.2, protein: 1.4, density: "low" }),
  food("Tea", "veg", { portion: 200, unit: "ml", carbs: 0, fat: 0, protein: 0, density: "low" }),
];

const byName = (n) => FOODS.find((f) => f.name === n);
const item = (name, qty = 1) => ({ qty, food_items: byName(name) });

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const ENTRIES = [
  { id: "e1", entry_date: today, meal_type: "Breakfast", mins_since_midnight: 480,
    felt_excessive: false, emotion: "Calm", context_note: null,
    entry_items: [item("Oats, dry"), item("Milk, whole"), item("Banana")] },
  { id: "e2", entry_date: today, meal_type: "Lunch", mins_since_midnight: 840,
    felt_excessive: false, emotion: null, context_note: null,
    entry_items: [item("Lettuce")] },                       // missing macros
  { id: "e3", entry_date: today, meal_type: "Evening snack", mins_since_midnight: 1300,
    felt_excessive: true, emotion: "Anxious",               // long gap, marked
    context_note: "Alone in the kitchen after a hard day.",
    entry_items: [item("Oats, dry", 2), item("Banana", 2)] },
  { id: "e4", entry_date: daysAgo(1), meal_type: "Dinner", mins_since_midnight: 1140,
    felt_excessive: false, emotion: null, context_note: null,
    entry_items: [item("Oats, dry")] },
  { id: "e5", entry_date: daysAgo(2), meal_type: "Breakfast", mins_since_midnight: 500,
    felt_excessive: false, emotion: null, context_note: null,
    // Deliberately hostile: PostgREST returns null for an embedded resource
    // that resolves to nothing. This exact shape threw "TypeError: e is not
    // iterable" and hung History on its loading state forever. Kept in the
    // fixture permanently so the resilience path is exercised every run.
    entry_items: null },
];

const JOURNALS = [
  { entry_date: daysAgo(1), format: "This week's theme: Hunger",
    saved_at: new Date().toISOString(),
    answers: {
      "hunger-1": { q: "Where did you notice hunger today, and how did you respond to it?",
                    a: "Around 4pm. I waited, and by 7 it had turned into something else." },
    } },
];

const PROFILE = {
  id: USER_ID, display_name: "Demo", birth_year: 1998,
  created_at: "2026-07-18T00:00:00Z", consented_at: "2026-07-18T00:00:00Z",
  consent_version: "2026-08-01",
};

// ---------------------------------------------------------------------------

function send(res, status, body, extra = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Expose-Headers": "Content-Range",
    ...extra,
  });
  res.end(payload);
}

/** PostgREST returns a single object rather than an array when asked to. */
const single = (req) => (req.headers.accept || "").includes("vnd.pgrst.object");

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") return send(res, 204, {});

  // --- auth -------------------------------------------------------------
  if (path === "/auth/v1/token") return send(res, 200, session());
  if (path === "/auth/v1/user") return send(res, 200, USER);
  if (path === "/auth/v1/logout") return send(res, 204, {});
  if (path === "/auth/v1/recover") return send(res, 200, {});

  // --- rest -------------------------------------------------------------
  if (path.startsWith("/rest/v1/rpc/")) {
    const fn = path.split("/").pop();
    if (fn === "log_entry") return send(res, 200, "new-entry-id");
    if (fn === "delete_my_account") return send(res, 204, {});
    return send(res, 200, {});
  }

  if (path.startsWith("/rest/v1/")) {
    const table = path.replace("/rest/v1/", "");
    if (req.method === "DELETE") return send(res, 204, {});
    if (req.method === "POST" || req.method === "PATCH") return send(res, 201, {});

    if (table === "food_items") return send(res, 200, FOODS);
    if (table === "profiles") return send(res, 200, single(req) ? PROFILE : [PROFILE]);

    if (table === "entries") {
      // Honour the entry_date filter so Today shows only today, and History
      // sees the full range — the distinction several screens depend on.
      const eq = url.searchParams.get("entry_date");
      let rows = ENTRIES;
      if (eq && eq.startsWith("eq.")) rows = rows.filter((e) => e.entry_date === eq.slice(3));
      if (eq && eq.startsWith("gte.")) rows = rows.filter((e) => e.entry_date >= eq.slice(4));
      return send(res, 200, rows);
    }

    if (table === "journal_entries") {
      const eq = url.searchParams.get("entry_date");
      let rows = JOURNALS;
      if (eq && eq.startsWith("eq.")) rows = rows.filter((j) => j.entry_date === eq.slice(3));
      if (single(req)) return send(res, 200, rows[0] ?? null);
      return send(res, 200, rows);
    }
    return send(res, 200, []);
  }

  send(res, 404, { error: "not mocked", path });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock-supabase listening on http://127.0.0.1:${PORT}`);
});

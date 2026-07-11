// /api/notification-preferences — GET (defaults) & PATCH (echo merged).
//
// Per spec, preferences are stored CLIENT-SIDE in localStorage to avoid another
// Prisma schema migration. These endpoints exist for API contract completeness
// and as a server-side mirror via a long-lived cookie (`nw_notif_prefs`). The
// client is the source of truth — it stores preferences in localStorage and
// passes them in the request body to `/api/notifications/generate`.
//
// Cookie strategy: when PATCH is called, we set the cookie with the merged
// preferences. GET reads the cookie (or returns defaults if absent). This way
// the server has access to preferences if needed in the future (e.g. email
// notification service), without requiring a schema migration.
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export interface NotificationPreferences {
  lowStock: boolean;
  paymentPending: boolean;
  staleLead: boolean;
  researchCompleted: boolean;
  goalAchieved: boolean;
  orderNew: boolean;
  campaignSent: boolean;
  system: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  lowStock: true,
  paymentPending: true,
  staleLead: true,
  researchCompleted: true,
  goalAchieved: true,
  orderNew: true,
  campaignSent: true,
  system: true,
  emailEnabled: true,
  pushEnabled: true,
};

const COOKIE_NAME = "nw_notif_prefs";

// Boolean preference keys — used to validate partial PATCH bodies.
const PREF_KEYS: (keyof NotificationPreferences)[] = [
  "lowStock",
  "paymentPending",
  "staleLead",
  "researchCompleted",
  "goalAchieved",
  "orderNew",
  "campaignSent",
  "system",
  "emailEnabled",
  "pushEnabled",
];

// Read preferences from cookie, falling back to defaults on any error.
function readFromCookie(raw: string | undefined): NotificationPreferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(raw);
    const out: NotificationPreferences = { ...DEFAULT_PREFERENCES };
    for (const k of PREF_KEYS) {
      if (typeof parsed?.[k] === "boolean") out[k] = parsed[k];
    }
    return out;
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

// GET /api/notification-preferences
export async function GET() {
  const jar = await cookies();
  const prefs = readFromCookie(jar.get(COOKIE_NAME)?.value);
  return NextResponse.json({ preferences: prefs });
}

// PATCH /api/notification-preferences
// Body: partial NotificationPreferences object. Missing keys retain their
// current value. Returns the merged preferences object.
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const jar = await cookies();
  const current = readFromCookie(jar.get(COOKIE_NAME)?.value);

  // Merge — only accept boolean values for known keys; ignore garbage.
  for (const k of PREF_KEYS) {
    if (typeof body?.[k] === "boolean") {
      (current[k] as boolean) = body[k];
    }
  }

  // Persist to cookie (1 year, lax same-site — preferences are not sensitive).
  jar.set(COOKIE_NAME, JSON.stringify(current), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false, // client can also read it if needed
  });

  return NextResponse.json({ preferences: current });
}

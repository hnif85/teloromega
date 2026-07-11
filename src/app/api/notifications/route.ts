// /api/notifications — list (GET) & create (POST) notifications for the logged-in user.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Allowed notification types — kept in sync with the section's preferences tab.
export const NOTIFICATION_TYPES = [
  "low_stock",
  "payment_pending",
  "stale_lead",
  "research_completed",
  "goal_achieved",
  "order_new",
  "campaign_sent",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_SEVERITIES = ["info", "warning", "success", "error"] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

// Shape returned to the client — adds a `read` boolean so the UI doesn't need to
// do null-checks on `readAt` everywhere.
function shape(n: {
  id: string;
  userId: string;
  brandId: string | null;
  type: string;
  title: string;
  message: string;
  severity: string;
  readAt: Date | null;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: string | null;
  createdAt: Date;
}) {
  return {
    id: n.id,
    userId: n.userId,
    brandId: n.brandId,
    type: n.type,
    title: n.title,
    message: n.message,
    severity: n.severity,
    read: n.readAt != null,
    readAt: n.readAt,
    actionUrl: n.actionUrl,
    actionLabel: n.actionLabel,
    metadata: n.metadata,
    createdAt: n.createdAt,
  };
}

// GET /api/notifications?unreadOnly=true&limit=50&brandId=Y
//
// Returns the user's notifications sorted newest-first. Supports:
//   - unreadOnly=true  → only rows where readAt IS NULL
//   - brandId=Y        → only rows for that brand (NULL brandId = system-wide)
//   - limit=N          → cap (default 50, max 200)
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const unreadOnly = sp.get("unreadOnly") === "true";
  const brandId = sp.get("brandId");
  const limitRaw = Number(sp.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 200) : 50;

  const where: {
    userId: string;
    readAt?: Date | null;
    brandId?: string;
  } = { userId };
  if (unreadOnly) where.readAt = null;
  if (brandId) where.brandId = brandId;

  const rows = await db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Unread count is useful for the topbar badge — return alongside rows.
  const unreadCount = await db.notification.count({
    where: { userId, readAt: null },
  });

  return NextResponse.json({
    notifications: rows.map(shape),
    unreadCount,
    total: rows.length,
  });
}

// POST /api/notifications — create a single notification (internal use).
// Body: { type, title, message, severity?, actionUrl?, actionLabel?, metadata?, brandId? }
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    type,
    title,
    message,
    severity,
    actionUrl,
    actionLabel,
    metadata,
    brandId,
  } = body as {
    type: string;
    title: string;
    message: string;
    severity?: string;
    actionUrl?: string | null;
    actionLabel?: string | null;
    metadata?: string | null;
    brandId?: string | null;
  };

  if (!type || !title || !message) {
    return NextResponse.json(
      { error: "type, title, message wajib diisi" },
      { status: 400 }
    );
  }
  if (!NOTIFICATION_TYPES.includes(type as NotificationType)) {
    return NextResponse.json(
      { error: `type tidak valid. Pilihan: ${NOTIFICATION_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Optional brand ownership check — if brandId is provided it must belong to
  // the user. NULL brandId means "system-wide" (no brand link).
  if (brandId) {
    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand || brand.userId !== userId) {
      return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
    }
  }

  const sev: string =
    severity && NOTIFICATION_SEVERITIES.includes(severity as NotificationSeverity)
      ? severity
      : "info";

  const created = await db.notification.create({
    data: {
      userId,
      brandId: brandId ?? null,
      type,
      title: String(title).slice(0, 200),
      message: String(message).slice(0, 1000),
      severity: sev,
      actionUrl: actionUrl ?? null,
      actionLabel: actionLabel ?? null,
      metadata: metadata ?? null,
    },
  });

  return NextResponse.json({ notification: shape(created) }, { status: 201 });
}

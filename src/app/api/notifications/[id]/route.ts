// /api/notifications/[id] — PATCH (mark read / unread) & DELETE
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

// PATCH /api/notifications/[id]  body: { read: boolean }
//   read=true  → set readAt to now() (mark as read)
//   read=false → set readAt to null (mark as unread)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { read } = body as { read?: boolean };

  if (typeof read !== "boolean") {
    return NextResponse.json(
      { error: "body harus { read: boolean }" },
      { status: 400 }
    );
  }

  const existing = await db.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json(
      { error: "notifikasi tidak ditemukan" },
      { status: 404 }
    );
  }

  const updated = await db.notification.update({
    where: { id },
    data: { readAt: read ? new Date() : null },
  });

  return NextResponse.json({ notification: shape(updated) });
}

// DELETE /api/notifications/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.notification.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json(
      { error: "notifikasi tidak ditemukan" },
      { status: 404 }
    );
  }

  await db.notification.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

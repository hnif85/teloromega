// /api/notifications/generate — POST scans dashboard data for the active brand
// and creates notifications for current alerts. Deduplicates against existing
// UNREAD notifications of the same type + referenceId.
//
// Body: { brandId, preferences? }
//   preferences is an optional object from the client (localStorage). When
//   provided, only notification types whose preference flag is `true` will be
//   generated. Missing preferences default to `true` (opt-out model).
//
// Returns: { generated: N, duplicates: N, scanned: {...} }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Map preference keys → notification type.
const PREF_TO_TYPE: Record<string, string> = {
  lowStock: "low_stock",
  paymentPending: "payment_pending",
  staleLead: "stale_lead",
  researchCompleted: "research_completed",
  goalAchieved: "goal_achieved",
  orderNew: "order_new",
  campaignSent: "campaign_sent",
  system: "system",
};

interface Preferences {
  lowStock?: boolean;
  paymentPending?: boolean;
  staleLead?: boolean;
  researchCompleted?: boolean;
  goalAchieved?: boolean;
  orderNew?: boolean;
  campaignSent?: boolean;
  system?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
}

// Returns `true` if the user has opted into the given notification type.
function prefEnabled(prefs: Preferences | undefined, prefKey: keyof Preferences): boolean {
  if (!prefs) return true;
  const v = prefs[prefKey];
  return v !== false; // undefined → true (opt-out)
}

// Build a quick lookup of existing UNREAD notification reference IDs per type.
// We fetch all unread notifications for the user (optionally scoped to brand)
// and parse their metadata JSON to extract the referenceId.
async function buildDedupIndex(
  userId: string,
  brandId: string
): Promise<Map<string, Set<string>>> {
  const rows = await db.notification.findMany({
    where: {
      userId,
      readAt: null,
      OR: [{ brandId }, { brandId: null }],
    },
    select: { type: true, metadata: true },
  });
  const idx = new Map<string, Set<string>>();
  for (const r of rows) {
    let refId: string | undefined;
    if (r.metadata) {
      try {
        const parsed = JSON.parse(r.metadata);
        refId = parsed?.referenceId;
      } catch {
        /* ignore malformed JSON */
      }
    }
    if (!refId) continue;
    let set = idx.get(r.type);
    if (!set) {
      set = new Set();
      idx.set(r.type, set);
    }
    set.add(refId);
  }
  return idx;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { brandId, preferences } = body as {
    brandId?: string;
    preferences?: Preferences;
  };

  if (!brandId) {
    return NextResponse.json(
      { error: "brandId wajib diisi" },
      { status: 400 }
    );
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const prefs = preferences;
  const now = new Date();
  const day24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // ── Parallel scan ────────────────────────────────────────────────────────
  const [
    lowStockProducts,
    pendingPaymentsOld,
    leadsStale,
    recentResearch,
    achievedGoals,
    dedupIndex,
  ] = await Promise.all([
    db.product.findMany({
      where: {
        brandId,
        type: "barang",
        isActive: true,
        stock: { not: null },
      },
      select: { id: true, name: true, stock: true, minStock: true },
    }),
    db.payment.findMany({
      where: {
        status: "Menunggu",
        createdAt: { lt: twoDaysAgo },
        order: { brandId },
      },
      include: { order: true },
      take: 50,
    }),
    db.lead.findMany({
      where: {
        brandId,
        stage: { notIn: ["Closed", "Deal"] },
        lastContactedAt: { lt: threeDaysAgo },
      },
      include: { customer: true },
    }),
    db.research.findMany({
      where: { brandId, createdAt: { gte: day24hAgo } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, query: true, intent: true, createdAt: true },
    }),
    db.goal.findMany({
      where: { brandId, status: "achieved" },
      select: { id: true, type: true, period: true, target: true, current: true },
    }),
    buildDedupIndex(userId, brandId),
  ]);

  // Low stock filter — same logic as /api/dashboard
  const lowStock = lowStockProducts.filter(
    (p) => p.minStock != null && (p.stock ?? 0) <= (p.minStock ?? 0)
  );

  // Build the list of notifications to create
  interface PendingCreate {
    type: string;
    title: string;
    message: string;
    severity: string;
    actionUrl: string | null;
    actionLabel: string | null;
    metadata: string | null;
  }
  const pending: PendingCreate[] = [];

  // ── Low stock ────────────────────────────────────────────────────────────
  if (prefEnabled(prefs, "lowStock")) {
    for (const p of lowStock) {
      pending.push({
        type: "low_stock",
        title: `Stok ${p.name} menipis`,
        message: `Sisa stok ${p.stock ?? 0} pcs (minimum ${p.minStock ?? 0}). Segera restok sebelum habis.`,
        severity: "warning",
        actionUrl: "/toko",
        actionLabel: "Restok",
        metadata: JSON.stringify({ referenceId: p.id, productId: p.id, stock: p.stock, minStock: p.minStock }),
      });
    }
  }

  // ── Pending payments > 2 days ────────────────────────────────────────────
  if (prefEnabled(prefs, "paymentPending")) {
    for (const pay of pendingPaymentsOld) {
      pending.push({
        type: "payment_pending",
        title: `Pembayaran menunggu verifikasi`,
        message: `Order ${pay.order?.id?.slice(-6) ?? "?"} — Rp ${pay.amount.toLocaleString("id-ID")} menunggu ${Math.floor(
          (now.getTime() - pay.createdAt.getTime()) / (24 * 60 * 60 * 1000)
        )} hari. Verifikasi segera.`,
        severity: "warning",
        actionUrl: "/toko",
        actionLabel: "Verifikasi",
        metadata: JSON.stringify({ referenceId: pay.id, orderId: pay.orderId, amount: pay.amount }),
      });
    }
  }

  // ── Stale leads (> 3 days) ───────────────────────────────────────────────
  if (prefEnabled(prefs, "staleLead")) {
    for (const lead of leadsStale) {
      pending.push({
        type: "stale_lead",
        title: `Lead ${lead.name} belum di-follow-up`,
        message: `Sudah > 3 hari sejak kontak terakhir (${lead.phone}). Hubungi kembali sebelum lead menjadi dingin.`,
        severity: "warning",
        actionUrl: "/toko",
        actionLabel: "Hubungi",
        metadata: JSON.stringify({ referenceId: lead.id, leadId: lead.id, phone: lead.phone }),
      });
    }
  }

  // ── Recent research (last 24h) ───────────────────────────────────────────
  if (prefEnabled(prefs, "researchCompleted")) {
    for (const r of recentResearch) {
      pending.push({
        type: "research_completed",
        title: `Riset "${r.query}" selesai`,
        message: `Hasil riset siap dilihat${r.intent ? ` (${r.intent})` : ""}. Terapkan ke konten / toko / keuangan.`,
        severity: "info",
        actionUrl: "/riset",
        actionLabel: "Lihat Hasil",
        metadata: JSON.stringify({ referenceId: r.id, researchId: r.id, query: r.query }),
      });
    }
  }

  // ── Achieved goals ───────────────────────────────────────────────────────
  if (prefEnabled(prefs, "goalAchieved")) {
    for (const g of achievedGoals) {
      pending.push({
        type: "goal_achieved",
        title: `Target ${g.type} tercapai! 🎉`,
        message: `Periode ${g.period}: ${g.current}/${g.target}. Pertahankan momentum, atau buat target baru.`,
        severity: "success",
        actionUrl: "/pengaturan",
        actionLabel: "Lihat Target",
        metadata: JSON.stringify({ referenceId: g.id, goalId: g.id, type: g.type, period: g.period }),
      });
    }
  }

  // ── Dedup against existing UNREAD notifications of same type+referenceId ─
  let generated = 0;
  let duplicates = 0;
  const toCreate: {
    userId: string;
    brandId: string;
    type: string;
    title: string;
    message: string;
    severity: string;
    actionUrl: string | null;
    actionLabel: string | null;
    metadata: string | null;
  }[] = [];

  for (const p of pending) {
    // Extract referenceId from the metadata we just built
    let refId: string | undefined;
    try {
      refId = p.metadata ? JSON.parse(p.metadata)?.referenceId : undefined;
    } catch {
      /* ignore */
    }
    const dedupSet = dedupIndex.get(p.type);
    if (refId && dedupSet?.has(refId)) {
      duplicates++;
      continue;
    }
    toCreate.push({
      userId,
      brandId,
      type: p.type,
      title: p.title,
      message: p.message,
      severity: p.severity,
      actionUrl: p.actionUrl,
      actionLabel: p.actionLabel,
      metadata: p.metadata,
    });
    // Also add to the in-memory dedup index so we don't create duplicates
    // within the same batch (e.g. two low-stock alerts for the same product
    // would never happen in practice, but defensive).
    if (refId) {
      let s = dedupIndex.get(p.type);
      if (!s) {
        s = new Set();
        dedupIndex.set(p.type, s);
      }
      s.add(refId);
    }
  }

  // ── Bulk create (skipping empty batches) ────────────────────────────────
  if (toCreate.length > 0) {
    // createMany is the most efficient path on SQLite — single INSERT.
    await db.notification.createMany({ data: toCreate });
    generated = toCreate.length;
  }

  return NextResponse.json({
    generated,
    duplicates,
    scanned: {
      lowStock: lowStock.length,
      pendingPayments: pendingPaymentsOld.length,
      staleLeads: leadsStale.length,
      recentResearch: recentResearch.length,
      achievedGoals: achievedGoals.length,
    },
  });
}

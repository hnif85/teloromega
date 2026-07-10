// /api/search — Global search across 6 models (products, orders, customers,
// leads, transactions, content). Like Spotlight/Alfred but for UMKM business
// data. Runs all 6 Prisma queries in parallel, computes a relevance score per
// hit (name exact > starts-with > contains > other-field), merges & sorts.
//
// GET /api/search?brandId=X&q=...&limit=20
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { formatRupiah, type SectionKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

// ─── Response types ───────────────────────────────────────────
export type SearchResultType =
  | "produk"
  | "order"
  | "customer"
  | "lead"
  | "transaksi"
  | "konten";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string; // primary label (product name, customer name, etc.)
  subtitle: string; // secondary info (price, phone, order total, etc.)
  icon: string; // emoji
  section: SectionKey; // where to navigate when clicked
  referenceId: string; // the model ID (for direct navigation)
  score: number; // relevance score (name match > description match)
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

// Scoring rules (per task spec):
//   exact name match       = 100
//   name starts with query = 80
//   name contains query    = 60
//   other field match      = 40
const SCORE_EXACT = 100;
const SCORE_STARTS = 80;
const SCORE_CONTAINS = 60;
const SCORE_OTHER = 40;

function scoreName(name: string, q: string): number {
  const n = name.toLowerCase();
  const needle = q.toLowerCase();
  if (n === needle) return SCORE_EXACT;
  if (n.startsWith(needle)) return SCORE_STARTS;
  if (n.includes(needle)) return SCORE_CONTAINS;
  return 0;
}

// Last 6 chars of a CUID — used as human-friendly order reference.
function shortRef(id: string): string {
  return id.slice(-6).toUpperCase();
}

// Check whether a non-name field contains the query (used to decide if the
// hit came from a "secondary" field, which only earns SCORE_OTHER).
function fieldMatches(value: unknown, q: string): boolean {
  if (value === null || value === undefined) return false;
  return String(value).toLowerCase().includes(q.toLowerCase());
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const brandId = sp.get("brandId");
  const q = (sp.get("q") ?? "").trim();
  let limit = parseInt(sp.get("limit") ?? "20", 10);
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  // Empty / too-short query → empty results (caller decides what to show).
  if (!q || q.length < 2) {
    return NextResponse.json<SearchResponse>({ results: [], total: 0, query: q });
  }
  if (!brandId) {
    return NextResponse.json<SearchResponse>({ results: [], total: 0, query: q });
  }

  // Verify brand ownership.
  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // Per-model take = limit. After merge + sort + slice we still get up to
  // `limit` items even if all top hits come from one model.
  const perModelTake = limit;

  // Prisma `contains` with `mode: "insensitive"` — SQLite is ASCII-CI by
  // default so this works for ASCII letters.
  const ci = { contains: q, mode: "insensitive" as const };

  // ── Parallel queries across 6 models ───────────────────────
  const [products, orders, customers, leads, transactions, contents] =
    await Promise.all([
      // Products: name, sku, description
      db.product.findMany({
        where: {
          brandId,
          OR: [{ name: ci }, { sku: ci }, { description: ci }],
        },
        orderBy: { createdAt: "desc" },
        take: perModelTake,
        select: {
          id: true,
          name: true,
          sku: true,
          description: true,
          price: true,
          type: true,
          stock: true,
          createdAt: true,
        },
      }),
      // Orders: customer name (via relation), lead name (via relation),
      // resi number. Short-ref (last 6 of order id) is matched client-side
      // after the broader query (SQLite LIKE can't easily match "ends-with"
      // on a CUID column without scanning all rows — the relation/resi OR
      // already narrows the candidate set to a handful).
      db.order.findMany({
        where: {
          brandId,
          OR: [
            { resiNumber: ci },
            { customer: { name: ci } },
            { lead: { name: ci } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: perModelTake,
        include: {
          customer: { select: { name: true } },
          lead: { select: { name: true } },
        },
      }),
      // Customers: name, phone, email
      db.customer.findMany({
        where: {
          brandId,
          OR: [{ name: ci }, { phone: ci }, { email: ci }],
        },
        orderBy: { createdAt: "desc" },
        take: perModelTake,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          totalOrders: true,
          totalSpent: true,
          createdAt: true,
        },
      }),
      // Leads: name, phone, notes
      db.lead.findMany({
        where: {
          brandId,
          OR: [{ name: ci }, { phone: ci }, { notes: ci }],
        },
        orderBy: { createdAt: "desc" },
        take: perModelTake,
        select: {
          id: true,
          name: true,
          phone: true,
          stage: true,
          sourceChannel: true,
          notes: true,
          createdAt: true,
        },
      }),
      // Transactions: description, category
      db.transaction.findMany({
        where: {
          brandId,
          OR: [{ description: ci }, { category: ci }],
        },
        orderBy: { createdAt: "desc" },
        take: perModelTake,
        select: {
          id: true,
          type: true,
          amount: true,
          category: true,
          description: true,
          date: true,
          createdAt: true,
        },
      }),
      // Content: body, platform, type
      db.content.findMany({
        where: {
          brandId,
          OR: [{ body: ci }, { platform: ci }, { type: ci }],
        },
        orderBy: { createdAt: "desc" },
        take: perModelTake,
        select: {
          id: true,
          type: true,
          platform: true,
          body: true,
          createdAt: true,
        },
      }),
    ]);

  // Build a cross-model createdAt-desc position map for stable tiebreaking
  // when scores are equal. We walk each model list (already createdAt-desc)
  // in a fixed order — lower index = newer.
  const position = new Map<string, number>();
  let idx = 0;
  for (const p of products) position.set(`produk-${p.id}`, idx++);
  for (const o of orders) position.set(`order-${o.id}`, idx++);
  for (const c of customers) position.set(`customer-${c.id}`, idx++);
  for (const l of leads) position.set(`lead-${l.id}`, idx++);
  for (const t of transactions) position.set(`transaksi-${t.id}`, idx++);
  for (const c of contents) position.set(`konten-${c.id}`, idx++);
  const orderOf = (id: string): number => position.get(id) ?? Number.MAX_SAFE_INTEGER;

  const results: SearchResult[] = [];

  // ── Map each model → SearchResult + score ──────────────────
  for (const p of products) {
    const nameScore = scoreName(p.name, q);
    const score =
      nameScore > 0 ||
      fieldMatches(p.sku, q) ||
      fieldMatches(p.description, q)
        ? Math.max(nameScore, SCORE_OTHER)
        : SCORE_OTHER;
    const parts: string[] = [formatRupiah(p.price)];
    if (p.type === "barang" && p.stock !== null) {
      parts.push(`Stok ${p.stock}`);
    } else if (p.type === "jasa") {
      parts.push("Jasa");
    }
    if (p.sku) parts.push(`SKU ${p.sku}`);
    results.push({
      id: `produk-${p.id}`,
      type: "produk",
      title: p.name,
      subtitle: parts.join(" · "),
      icon: "📦",
      section: "produk",
      referenceId: p.id,
      score,
    });
  }

  for (const o of orders) {
    const name = o.customer?.name ?? o.lead?.name ?? "Tanpa nama";
    const nameScore = scoreName(name, q);
    const refMatches = shortRef(o.id).toLowerCase() === q.toLowerCase();
    const resiMatches = fieldMatches(o.resiNumber, q);
    const score = Math.max(
      nameScore,
      refMatches ? SCORE_EXACT : 0,
      resiMatches ? SCORE_OTHER : 0,
      SCORE_OTHER, // fallback — we already filtered to relevant rows
    );
    const subtitleParts: string[] = [
      `#${shortRef(o.id)}`,
      formatRupiah(o.totalAmount),
    ];
    if (o.status) subtitleParts.push(o.status);
    if (o.resiNumber) subtitleParts.push(`Resi ${o.resiNumber}`);
    results.push({
      id: `order-${o.id}`,
      type: "order",
      title: `Order ${name}`,
      subtitle: subtitleParts.join(" · "),
      icon: "🛒",
      section: "toko",
      referenceId: o.id,
      score,
    });
  }

  for (const c of customers) {
    const nameScore = scoreName(c.name, q);
    const score =
      nameScore > 0 ||
      fieldMatches(c.phone, q) ||
      fieldMatches(c.email, q)
        ? Math.max(nameScore, SCORE_OTHER)
        : SCORE_OTHER;
    const subtitleParts: string[] = [c.phone];
    if (c.email) subtitleParts.push(c.email);
    if (c.totalOrders > 0) {
      subtitleParts.push(`${c.totalOrders} order · ${formatRupiah(c.totalSpent)}`);
    }
    results.push({
      id: `customer-${c.id}`,
      type: "customer",
      title: c.name,
      subtitle: subtitleParts.join(" · "),
      icon: "👤",
      section: "toko",
      referenceId: c.id,
      score,
    });
  }

  for (const l of leads) {
    const nameScore = scoreName(l.name, q);
    const score =
      nameScore > 0 ||
      fieldMatches(l.phone, q) ||
      fieldMatches(l.notes, q)
        ? Math.max(nameScore, SCORE_OTHER)
        : SCORE_OTHER;
    const subtitleParts: string[] = [l.phone, `Stage ${l.stage}`];
    if (l.sourceChannel) subtitleParts.push(`via ${l.sourceChannel}`);
    results.push({
      id: `lead-${l.id}`,
      type: "lead",
      title: l.name,
      subtitle: subtitleParts.join(" · "),
      icon: "👥",
      section: "toko",
      referenceId: l.id,
      score,
    });
  }

  for (const t of transactions) {
    const catScore = scoreName(t.category, q);
    const score = Math.max(catScore, SCORE_OTHER);
    const isIncome = t.type === "income";
    const sign = isIncome ? "+" : "−";
    const subtitleParts: string[] = [
      `${sign}${formatRupiah(t.amount)}`,
      t.category,
    ];
    if (t.description) {
      const excerpt =
        t.description.length > 60
          ? t.description.slice(0, 60) + "…"
          : t.description;
      subtitleParts.push(excerpt);
    }
    results.push({
      id: `transaksi-${t.id}`,
      type: "transaksi",
      title: isIncome ? "Pemasukan" : "Pengeluaran",
      subtitle: subtitleParts.join(" · "),
      icon: "💰",
      section: "keuangan",
      referenceId: t.id,
      score,
    });
  }

  for (const c of contents) {
    const typeScore = scoreName(c.type, q);
    const score =
      typeScore > 0 ||
      fieldMatches(c.platform, q) ||
      fieldMatches(c.body, q)
        ? Math.max(typeScore, SCORE_OTHER)
        : SCORE_OTHER;
    const excerpt = (c.body ?? "")
      .replace(/[#*`>\-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    const subtitleParts: string[] = [];
    if (c.platform) subtitleParts.push(c.platform);
    subtitleParts.push(c.type);
    if (excerpt) subtitleParts.push(excerpt);
    results.push({
      id: `konten-${c.id}`,
      type: "konten",
      title: `Konten ${c.type}`,
      subtitle: subtitleParts.join(" · "),
      icon: "📝",
      section: "konten",
      referenceId: c.id,
      score,
    });
  }

  // ── Sort by score desc, then createdAt desc (via position map) ──
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return orderOf(a.id) - orderOf(b.id); // lower idx = newer = first
  });

  const total = results.length;
  const sliced = results.slice(0, limit);

  return NextResponse.json<SearchResponse>({
    results: sliced,
    total,
    query: q,
  });
}

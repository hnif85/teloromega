// /api/import — POST: merge-import a JSON backup into a brand.
//
// Body:
//   { brandId: string, data: <exported JSON payload> }
//
// Strategy: MERGE, not replace.
//   - Products: skip if (name + brandId) already exists.
//   - Customers: skip if (phone + brandId) already exists.
//   - All other models: insert with fresh IDs (crypto.randomUUID()).
//   - Foreign-key references (customerId, leadId, orderId, productId,
//     researchId, contextId, campaignId) are remapped to the newly-inserted
//     row's ID. If the original referenced row was NOT imported (e.g. it
//     pointed to an existing product), the reference is set to null.
//   - userId fields: re-assigned to the importing user (privacy-safe).
//   - BrandId: always set to the target brand (NOT the source brand in the
//     backup file — supports cross-brand migration).
//
// Wrapped in a Prisma transaction — any failure rolls back everything.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const SUPPORTED_VERSION = "1.0";
const newId = () => crypto.randomUUID();

// ── Type helpers for the imported payload ─────────────────────────────────────
interface RawRow {
  [k: string]: unknown;
}
interface BackupData {
  products?: RawRow[];
  inventory?: RawRow[];
  customers?: RawRow[];
  leads?: RawRow[];
  orders?: RawRow[];
  payments?: RawRow[];
  transactions?: RawRow[];
  content?: RawRow[];
  research?: RawRow[];
  contexts?: RawRow[];
  contextUsage?: RawRow[];
  campaigns?: RawRow[];
  campaignRecipients?: RawRow[];
  inboxMessages?: RawRow[];
  receivables?: RawRow[];
  payables?: RawRow[];
  operationalCosts?: RawRow[];
  goals?: RawRow[];
  creditUsageLog?: RawRow[];
}
interface BackupPayload {
  version?: string;
  brand?: RawRow;
  data?: BackupData;
  counts?: Record<string, number>;
}

// ── Date / number / nullable coercion ─────────────────────────────────────────
function asDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}
function asInt(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    if (!isNaN(n)) return n;
  }
  return fallback;
}
function asFloat(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    if (!isNaN(n)) return n;
  }
  return fallback;
}
function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "true" || v === "1";
  return fallback;
}
function asStr(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
}
function asStrOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  return null;
}
function asDateOrNull(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

interface ImportResult {
  imported: Record<string, number>;
  skipped: Record<string, number>;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { brandId?: string; data?: BackupPayload };
    const brandId = body.brandId;
    const payload = body.data;

    if (!brandId) {
      return NextResponse.json({ error: "brandId wajib" }, { status: 400 });
    }
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "data backup tidak valid" }, { status: 400 });
    }
    if (payload.version !== SUPPORTED_VERSION) {
      return NextResponse.json(
        {
          error: `Versi backup tidak didukung (diharapkan "${SUPPORTED_VERSION}", diterima "${payload.version ?? "?"}")`,
        },
        { status: 400 }
      );
    }
    if (!payload.data || typeof payload.data !== "object") {
      return NextResponse.json({ error: "data.data tidak ditemukan di backup" }, { status: 400 });
    }

    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand || brand.userId !== userId) {
      return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
    }

    const data = payload.data;
    const imported: Record<string, number> = {};
    const skipped: Record<string, number> = {};
    const bumpImported = (k: string) => (imported[k] = (imported[k] ?? 0) + 1);
    const bumpSkipped = (k: string) => (skipped[k] = (skipped[k] ?? 0) + 1);

    try {
      await db.$transaction(async (tx) => {
        // ── 1) PRODUCTS — skip if (name + brandId) already exists ────────────
        const productIdMap = new Map<string, string>(); // oldId → newId
        for (const r of data.products ?? []) {
          const name = asStr(r.name);
          const exists = await tx.product.findFirst({
            where: { brandId, name },
            select: { id: true },
          });
          if (exists) {
            productIdMap.set(asStr(r.id), exists.id);
            bumpSkipped("products");
            continue;
          }
          const oldId = asStr(r.id);
          const id = newId();
          await tx.product.create({
            data: {
              id,
              brandId,
              type: asStr(r.type, "barang"),
              name,
              price: asInt(r.price),
              costPrice: r.costPrice == null ? null : asInt(r.costPrice),
              stock: r.stock == null ? null : asInt(r.stock),
              minStock: r.minStock == null ? null : asInt(r.minStock),
              sku: asStrOrNull(r.sku),
              description: asStrOrNull(r.description),
              imageUrl: asStrOrNull(r.imageUrl),
              isActive: asBool(r.isActive, true),
              createdAt: asDate(r.createdAt),
              updatedAt: asDate(r.updatedAt),
            },
          });
          productIdMap.set(oldId, id);
          bumpImported("products");
        }

        // ── 2) INVENTORY — insert if its product was imported ────────────────
        for (const r of data.inventory ?? []) {
          const oldPid = asStr(r.productId);
          const newPid = productIdMap.get(oldPid);
          if (!newPid) {
            // Original product wasn't imported (either pre-existed or absent);
            // skip to avoid orphan inventory rows.
            bumpSkipped("inventory");
            continue;
          }
          await tx.inventory.create({
            data: {
              id: newId(),
              productId: newPid,
              variant: asStr(r.variant),
              stock: asInt(r.stock),
              updatedAt: asDate(r.updatedAt),
            },
          });
          bumpImported("inventory");
        }

        // ── 3) CUSTOMERS — skip if (phone + brandId) already exists ──────────
        const customerIdMap = new Map<string, string>();
        for (const r of data.customers ?? []) {
          const phone = asStr(r.phone);
          const exists = await tx.customer.findUnique({
            where: { brandId_phone: { brandId, phone } },
            select: { id: true },
          });
          if (exists) {
            customerIdMap.set(asStr(r.id), exists.id);
            bumpSkipped("customers");
            continue;
          }
          const oldId = asStr(r.id);
          const id = newId();
          await tx.customer.create({
            data: {
              id,
              brandId,
              name: asStr(r.name),
              phone,
              email: asStrOrNull(r.email),
              firstOrderAt: asDateOrNull(r.firstOrderAt),
              totalOrders: asInt(r.totalOrders),
              totalSpent: asInt(r.totalSpent),
              createdAt: asDate(r.createdAt),
            },
          });
          customerIdMap.set(oldId, id);
          bumpImported("customers");
        }

        // ── 4) LEADS — insert with new IDs; remap customerId ─────────────────
        const leadIdMap = new Map<string, string>();
        for (const r of data.leads ?? []) {
          const oldCustomer = asStrOrNull(r.customerId);
          const newCustomer = oldCustomer ? customerIdMap.get(oldCustomer) ?? null : null;
          const oldId = asStr(r.id);
          const id = newId();
          await tx.lead.create({
            data: {
              id,
              brandId,
              customerId: newCustomer,
              name: asStr(r.name),
              phone: asStr(r.phone),
              sourceChannel: asStr(r.sourceChannel, "wa"),
              stage: asStr(r.stage, "Baru"),
              notes: asStrOrNull(r.notes),
              assignedTo: asStrOrNull(r.assignedTo),
              lastContactedAt: asDateOrNull(r.lastContactedAt),
              createdAt: asDate(r.createdAt),
              updatedAt: asDate(r.updatedAt),
            },
          });
          leadIdMap.set(oldId, id);
          bumpImported("leads");
        }

        // ── 5) ORDERS — insert with new IDs; remap customerId/leadId ─────────
        const orderIdMap = new Map<string, string>();
        for (const r of data.orders ?? []) {
          const oldCustomer = asStrOrNull(r.customerId);
          const newCustomer = oldCustomer ? customerIdMap.get(oldCustomer) ?? null : null;
          const oldLead = asStrOrNull(r.leadId);
          const newLead = oldLead ? leadIdMap.get(oldLead) ?? null : null;
          const oldId = asStr(r.id);
          const id = newId();
          await tx.order.create({
            data: {
              id,
              brandId,
              customerId: newCustomer,
              leadId: newLead,
              items: asStr(r.items, "[]"),
              totalAmount: asInt(r.totalAmount),
              status: asStr(r.status, "Baru"),
              resiNumber: asStrOrNull(r.resiNumber),
              shippingCourier: asStrOrNull(r.shippingCourier),
              shippingCost: r.shippingCost == null ? null : asInt(r.shippingCost),
              notes: asStrOrNull(r.notes),
              createdAt: asDate(r.createdAt),
              updatedAt: asDate(r.updatedAt),
            },
          });
          orderIdMap.set(oldId, id);
          bumpImported("orders");
        }

        // ── 6) PAYMENTS — insert with new IDs; remap orderId ─────────────────
        for (const r of data.payments ?? []) {
          const oldOrder = asStr(r.orderId);
          const newOrder = orderIdMap.get(oldOrder);
          if (!newOrder) {
            // Order wasn't imported — skip orphan payment.
            bumpSkipped("payments");
            continue;
          }
          await tx.payment.create({
            data: {
              id: newId(),
              orderId: newOrder,
              amount: asInt(r.amount),
              method: asStr(r.method, "transfer"),
              status: asStr(r.status, "Menunggu"),
              proofImageUrl: asStrOrNull(r.proofImageUrl),
              verifiedAt: asDateOrNull(r.verifiedAt),
              createdAt: asDate(r.createdAt),
            },
          });
          bumpImported("payments");
        }

        // ── 7) TRANSACTIONS — insert with new IDs; remap productId/customerId/orderId ─
        for (const r of data.transactions ?? []) {
          const oldProduct = asStrOrNull(r.productId);
          const newProduct = oldProduct ? productIdMap.get(oldProduct) ?? null : null;
          const oldCustomer = asStrOrNull(r.customerId);
          const newCustomer = oldCustomer ? customerIdMap.get(oldCustomer) ?? null : null;
          const oldOrder = asStrOrNull(r.orderId);
          const newOrder = oldOrder ? orderIdMap.get(oldOrder) ?? null : null;
          await tx.transaction.create({
            data: {
              id: newId(),
              userId,
              brandId,
              productId: newProduct,
              customerId: newCustomer,
              orderId: newOrder,
              type: asStr(r.type, "expense"),
              category: asStr(r.category, "lainnya"),
              amount: asInt(r.amount),
              costAmount: r.costAmount == null ? null : asInt(r.costAmount),
              quantity: r.quantity == null ? null : asInt(r.quantity),
              description: asStrOrNull(r.description),
              date: asDate(r.date),
              createdAt: asDate(r.createdAt),
            },
          });
          bumpImported("transactions");
        }

        // ── 8) CONTENT — insert with new IDs; remap productId ────────────────
        for (const r of data.content ?? []) {
          const oldProduct = asStrOrNull(r.productId);
          const newProduct = oldProduct ? productIdMap.get(oldProduct) ?? null : null;
          await tx.content.create({
            data: {
              id: newId(),
              brandId,
              productId: newProduct,
              contextId: null, // contexts come later; link deferred to step 9
              type: asStr(r.type, "caption"),
              body: asStrOrNull(r.body),
              assetUrl: asStrOrNull(r.assetUrl),
              platform: asStrOrNull(r.platform),
              createdAt: asDate(r.createdAt),
            },
          });
          bumpImported("content");
        }

        // ── 9) RESEARCH — insert with new IDs ────────────────────────────────
        const researchIdMap = new Map<string, string>();
        for (const r of data.research ?? []) {
          const oldId = asStr(r.id);
          const id = newId();
          await tx.research.create({
            data: {
              id,
              userId,
              brandId,
              query: asStr(r.query),
              intent: asStrOrNull(r.intent),
              resultJson: asStr(r.resultJson, "{}"),
              status: asStr(r.status, "completed"),
              createdAt: asDate(r.createdAt),
            },
          });
          researchIdMap.set(oldId, id);
          bumpImported("research");
        }

        // ── 10) CONTEXTS — insert with new IDs; remap researchId ─────────────
        const contextIdMap = new Map<string, string>();
        for (const r of data.contexts ?? []) {
          const oldResearch = asStr(r.researchId);
          const newResearch = researchIdMap.get(oldResearch);
          if (!newResearch) {
            bumpSkipped("contexts");
            continue;
          }
          const oldId = asStr(r.id);
          const id = newId();
          await tx.context.create({
            data: {
              id,
              researchId: newResearch,
              brandId,
              targetModule: asStr(r.targetModule, "konten"),
              contextJson: asStr(r.contextJson, "{}"),
              createdAt: asDate(r.createdAt),
            },
          });
          contextIdMap.set(oldId, id);
          bumpImported("contexts");
        }

        // ── 11) CONTEXT_USAGE — insert with new IDs; remap contextId ─────────
        for (const r of data.contextUsage ?? []) {
          const oldContext = asStr(r.contextId);
          const newContext = contextIdMap.get(oldContext);
          if (!newContext) {
            bumpSkipped("contextUsage");
            continue;
          }
          await tx.contextUsage.create({
            data: {
              id: newId(),
              contextId: newContext,
              brandId,
              usedFor: asStr(r.usedFor),
              referenceId: asStrOrNull(r.referenceId),
              createdAt: asDate(r.createdAt),
            },
          });
          bumpImported("contextUsage");
        }

        // ── 12) CAMPAIGNS — insert with new IDs ──────────────────────────────
        const campaignIdMap = new Map<string, string>();
        for (const r of data.campaigns ?? []) {
          const oldId = asStr(r.id);
          const id = newId();
          await tx.campaign.create({
            data: {
              id,
              brandId,
              channel: asStr(r.channel, "wa"),
              name: asStr(r.name),
              subject: asStrOrNull(r.subject),
              body: asStr(r.body),
              scheduledAt: asDateOrNull(r.scheduledAt),
              sentAt: asDateOrNull(r.sentAt),
              status: asStr(r.status, "draft"),
              createdAt: asDate(r.createdAt),
            },
          });
          campaignIdMap.set(oldId, id);
          bumpImported("campaigns");
        }

        // ── 13) CAMPAIGN_RECIPIENTS — insert; remap campaignId/customerId/leadId ─
        for (const r of data.campaignRecipients ?? []) {
          const oldCampaign = asStr(r.campaignId);
          const newCampaign = campaignIdMap.get(oldCampaign);
          if (!newCampaign) {
            bumpSkipped("campaignRecipients");
            continue;
          }
          const oldCustomer = asStrOrNull(r.customerId);
          const newCustomer = oldCustomer ? customerIdMap.get(oldCustomer) ?? null : null;
          const oldLead = asStrOrNull(r.leadId);
          const newLead = oldLead ? leadIdMap.get(oldLead) ?? null : null;
          await tx.campaignRecipient.create({
            data: {
              id: newId(),
              campaignId: newCampaign,
              customerId: newCustomer,
              leadId: newLead,
              contact: asStr(r.contact),
              sent: asBool(r.sent, false),
              deliveredAt: asDateOrNull(r.deliveredAt),
              openedAt: asDateOrNull(r.openedAt),
              clickedAt: asDateOrNull(r.clickedAt),
            },
          });
          bumpImported("campaignRecipients");
        }

        // ── 14) INBOX_MESSAGES — insert with new IDs; userId re-assigned ─────
        for (const r of data.inboxMessages ?? []) {
          await tx.inboxMessage.create({
            data: {
              id: newId(),
              brandId,
              userId,
              channel: asStr(r.channel, "wa"),
              fromNumber: asStr(r.fromNumber),
              fromName: asStrOrNull(r.fromName),
              messageText: asStr(r.messageText),
              direction: asStr(r.direction, "inbound"),
              repliedBy: asStrOrNull(r.repliedBy),
              leadId: null, // leadId remap skipped — inbound WA reply context
              createdAt: asDate(r.createdAt),
            },
          });
          bumpImported("inboxMessages");
        }

        // ── 15) RECEIVABLES — insert with new IDs; remap customerId ───────────
        for (const r of data.receivables ?? []) {
          const oldCustomer = asStrOrNull(r.customerId);
          const newCustomer = oldCustomer ? customerIdMap.get(oldCustomer) ?? null : null;
          await tx.receivable.create({
            data: {
              id: newId(),
              userId,
              brandId,
              customerId: newCustomer,
              customerName: asStr(r.customerName),
              amount: asInt(r.amount),
              dueDate: asDate(r.dueDate),
              status: asStr(r.status, "outstanding"),
              createdAt: asDate(r.createdAt),
            },
          });
          bumpImported("receivables");
        }

        // ── 16) PAYABLES — insert with new IDs ───────────────────────────────
        for (const r of data.payables ?? []) {
          await tx.payable.create({
            data: {
              id: newId(),
              userId,
              brandId,
              supplierName: asStr(r.supplierName),
              amount: asInt(r.amount),
              dueDate: asDate(r.dueDate),
              status: asStr(r.status, "outstanding"),
              createdAt: asDate(r.createdAt),
            },
          });
          bumpImported("payables");
        }

        // ── 17) OPERATIONAL_COSTS — insert with new IDs ──────────────────────
        for (const r of data.operationalCosts ?? []) {
          await tx.operationalCost.create({
            data: {
              id: newId(),
              userId,
              brandId,
              category: asStr(r.category),
              amount: asInt(r.amount),
              recurring: asBool(r.recurring, false),
              date: asDate(r.date),
              createdAt: asDate(r.createdAt),
            },
          });
          bumpImported("operationalCosts");
        }

        // ── 18) GOALS — insert with new IDs ──────────────────────────────────
        for (const r of data.goals ?? []) {
          await tx.goal.create({
            data: {
              id: newId(),
              brandId,
              userId,
              type: asStr(r.type, "revenue"),
              period: asStr(r.period, "monthly"),
              target: asFloat(r.target),
              current: asFloat(r.current),
              startDate: asDate(r.startDate),
              endDate: asDate(r.endDate),
              status: asStr(r.status, "active"),
              notes: asStrOrNull(r.notes),
              createdAt: asDate(r.createdAt),
              updatedAt: asDate(r.updatedAt),
            },
          });
          bumpImported("goals");
        }

        // ── 19) CREDIT_USAGE_LOG — insert with new IDs; userId re-assigned ───
        //    (informational history; doesn't affect actual balance)
        for (const r of data.creditUsageLog ?? []) {
          await tx.creditUsageLog.create({
            data: {
              id: newId(),
              userId,
              brandId,
              actionKey: asStr(r.actionKey),
              creditCost: asInt(r.creditCost),
              balanceBefore: asInt(r.balanceBefore),
              balanceAfter: asInt(r.balanceAfter),
              referenceId: asStrOrNull(r.referenceId),
              status: asStr(r.status, "charged"),
              createdAt: asDate(r.createdAt),
            },
          });
          bumpImported("creditUsageLog");
        }
      });
    } catch (txErr) {
      // Distinguish known Prisma errors from unexpected ones for clearer UX.
      if (txErr instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("[import] prisma error:", txErr.code, txErr.message);
        return NextResponse.json(
          { error: `Gagal import (kode ${txErr.code})`, detail: txErr.message },
          { status: 400 }
        );
      }
      throw txErr; // re-throw to outer catch
    }

    return NextResponse.json({ imported, skipped });
  } catch (err) {
    console.error("[import] fatal:", err);
    return NextResponse.json(
      { error: "Gagal import data", detail: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 }
    );
  }
}

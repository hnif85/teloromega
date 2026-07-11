// /api/export — GET: export ALL data for a brand as a downloadable JSON file.
//
// Query params:
//   brandId (required) — must belong to authenticated user.
//
// Response: application/json attachment with shape:
//   {
//     version: "1.0",
//     exportedAt: ISO string,
//     brand: { id, name, slug, category, description, toneOfVoice, logoUrl },
//     data: { products, inventory, customers, leads, orders, payments,
//             transactions, content, research, contexts, campaigns,
//             campaignRecipients, inboxMessages, receivables, payables,
//             operationalCosts, goals, creditUsageLog },
//     counts: { ...same keys as data, with N },
//   }
//
// userId fields are stripped from each row (privacy — re-assigned on import).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ── helper: strip userId from rows (privacy) ──────────────────────────────────
function stripUserId<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((r) => {
    const next = { ...r };
    delete (next as { userId?: unknown }).userId;
    return next;
  });
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const brandId = req.nextUrl.searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json({ error: "brandId wajib" }, { status: 400 });
    }

    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand || brand.userId !== userId) {
      return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
    }

    // ── Parallel fetch of every brand-scoped model ──────────────────────────
    // Payments & Inventory & CampaignRecipients have no direct brandId —
    // we filter through their parent (Order / Product / Campaign).
    const [
      products,
      inventory,
      customers,
      leads,
      orders,
      payments,
      transactions,
      content,
      research,
      contexts,
      contextUsage,
      campaigns,
      campaignRecipients,
      inboxMessages,
      receivables,
      payables,
      operationalCosts,
      goals,
      creditUsageLog,
    ] = await Promise.all([
      db.product.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.inventory.findMany({ where: { product: { brandId } }, orderBy: { updatedAt: "asc" } }),
      db.customer.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.lead.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.order.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.payment.findMany({ where: { order: { brandId } }, orderBy: { createdAt: "asc" } }),
      db.transaction.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.content.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.research.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.context.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.contextUsage.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.campaign.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.campaignRecipient.findMany({ where: { campaign: { brandId } }, orderBy: { campaignId: "asc" } }),
      db.inboxMessage.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.receivable.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.payable.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.operationalCost.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.goal.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
      db.creditUsageLog.findMany({ where: { brandId }, orderBy: { createdAt: "asc" } }),
    ]);

    // ── Strip userId from every row (privacy — re-assigned on import) ───────
    const data = {
      products: stripUserId(products as Record<string, unknown>[]),
      inventory,
      customers: stripUserId(customers as Record<string, unknown>[]),
      leads: stripUserId(leads as Record<string, unknown>[]),
      orders: stripUserId(orders as Record<string, unknown>[]),
      payments,
      transactions: stripUserId(transactions as Record<string, unknown>[]),
      content,
      research: stripUserId(research as Record<string, unknown>[]),
      contexts,
      contextUsage: stripUserId(contextUsage as Record<string, unknown>[]),
      campaigns,
      campaignRecipients,
      inboxMessages: stripUserId(inboxMessages as Record<string, unknown>[]),
      receivables: stripUserId(receivables as Record<string, unknown>[]),
      payables: stripUserId(payables as Record<string, unknown>[]),
      operationalCosts: stripUserId(operationalCosts as Record<string, unknown>[]),
      goals: stripUserId(goals as Record<string, unknown>[]),
      creditUsageLog: stripUserId(creditUsageLog as Record<string, unknown>[]),
    };

    const counts = {
      products: data.products.length,
      inventory: data.inventory.length,
      customers: data.customers.length,
      leads: data.leads.length,
      orders: data.orders.length,
      payments: data.payments.length,
      transactions: data.transactions.length,
      content: data.content.length,
      research: data.research.length,
      contexts: data.contexts.length,
      contextUsage: data.contextUsage.length,
      campaigns: data.campaigns.length,
      campaignRecipients: data.campaignRecipients.length,
      inboxMessages: data.inboxMessages.length,
      receivables: data.receivables.length,
      payables: data.payables.length,
      operationalCosts: data.operationalCosts.length,
      goals: data.goals.length,
      creditUsageLog: data.creditUsageLog.length,
    };

    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      brand: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        category: brand.category,
        description: brand.description,
        toneOfVoice: brand.toneOfVoice,
        logoUrl: brand.logoUrl,
      },
      data,
      counts,
    };

    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `nextwhiz-backup-${brand.slug}-${dateStr}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[export] fatal:", err);
    return NextResponse.json(
      { error: "Gagal export data", detail: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 }
    );
  }
}

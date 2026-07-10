// /api/demo/reset — POST: clear ALL data for a brand (foreign-key-safe order)
// Brand itself is preserved. Deletes user-created data: products, leads, customers,
// orders, payments, transactions, content, research, contexts, inbox, campaigns,
// receivables, payables, operational_costs, inventory, credit_usage_log.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { brandId } = body as { brandId?: string };
    if (!brandId) {
      return NextResponse.json({ error: "brandId wajib" }, { status: 400 });
    }

    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand || brand.userId !== userId) {
      return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
    }

    // ── Delete in FK-safe order (deepest dependents first) ────────────────
    // 1) Campaign recipients → Campaigns (brandId on Campaign)
    const campaignDeleted = await db.campaignRecipient.deleteMany({
      where: { campaign: { brandId } },
    });
    const campaignCount = await db.campaign.deleteMany({ where: { brandId } });

    // 2) Transactions (brandId directly)
    const txCount = await db.transaction.deleteMany({ where: { brandId } });

    // 3) Payments → Orders
    // Payment has no brandId; join through Order.
    const paymentDeleted = await db.payment.deleteMany({
      where: { order: { brandId } },
    });
    const orderCount = await db.order.deleteMany({ where: { brandId } });

    // 4) Receivables, Payables, OperationalCost (brandId direct)
    const receivableCount = await db.receivable.deleteMany({ where: { brandId } });
    const payableCount = await db.payable.deleteMany({ where: { brandId } });
    const opCostCount = await db.operationalCost.deleteMany({ where: { brandId } });

    // 5) Leads
    const leadCount = await db.lead.deleteMany({ where: { brandId } });

    // 6) Customers
    const customerCount = await db.customer.deleteMany({ where: { brandId } });

    // 7) Content
    const contentCount = await db.content.deleteMany({ where: { brandId } });

    // 8) ContextUsage → Context → Research
    const ctxUsageCount = await db.contextUsage.deleteMany({ where: { brandId } });
    const contextCount = await db.context.deleteMany({ where: { brandId } });
    const researchCount = await db.research.deleteMany({ where: { brandId } });

    // 9) Inbox messages
    const inboxCount = await db.inboxMessage.deleteMany({ where: { brandId } });

    // 10) Credit usage log (brandId optional but scoped here)
    const creditLogCount = await db.creditUsageLog.deleteMany({ where: { brandId } });

    // 11) Inventory (join via Product) → Products
    const inventoryCount = await db.inventory.deleteMany({
      where: { product: { brandId } },
    });
    const productCount = await db.product.deleteMany({ where: { brandId } });

    return NextResponse.json({
      reset: true,
      deleted: {
        campaignRecipients: campaignDeleted.count,
        campaigns: campaignCount.count,
        transactions: txCount.count,
        payments: paymentDeleted.count,
        orders: orderCount.count,
        receivables: receivableCount.count,
        payables: payableCount.count,
        operationalCosts: opCostCount.count,
        leads: leadCount.count,
        customers: customerCount.count,
        content: contentCount.count,
        contextUsage: ctxUsageCount.count,
        contexts: contextCount.count,
        research: researchCount.count,
        inbox: inboxCount.count,
        creditUsageLog: creditLogCount.count,
        inventory: inventoryCount.count,
        products: productCount.count,
      },
    });
  } catch (err) {
    console.error("[demo/reset] fatal:", err);
    return NextResponse.json(
      { error: "Gagal mereset data", detail: err instanceof Error ? err.message : "unknown_error" },
      { status: 500 }
    );
  }
}

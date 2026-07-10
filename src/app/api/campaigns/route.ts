// /api/campaigns — list & create
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { chargeCredit } from "@/lib/credit";
import type { CreditActionKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ campaigns: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const campaigns = await db.campaign.findMany({
    where: { brandId },
    include: { _count: { select: { recipients: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Add aggregate stats per campaign
  const withStats = await Promise.all(
    campaigns.map(async (c) => {
      const sentCount = await db.campaignRecipient.count({
        where: { campaignId: c.id, sent: true },
      });
      const openedCount = await db.campaignRecipient.count({
        where: { campaignId: c.id, openedAt: { not: null } },
      });
      const clickedCount = await db.campaignRecipient.count({
        where: { campaignId: c.id, clickedAt: { not: null } },
      });
      return {
        ...c,
        recipientCount: c._count.recipients,
        sentCount,
        openedCount,
        clickedCount,
      };
    })
  );

  return NextResponse.json({ campaigns: withStats });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const {
    brandId,
    channel,
    name,
    subject,
    body: campaignBody,
    recipientIds,
    scheduledAt,
  } = body as {
    brandId: string;
    channel: "wa" | "email";
    name: string;
    subject?: string;
    body: string;
    recipientIds: { customerId?: string; leadId?: string; contact: string }[];
    scheduledAt?: string;
  };

  if (!brandId || !channel || !name?.trim() || !campaignBody?.trim() || !Array.isArray(recipientIds)) {
    return NextResponse.json(
      { error: "brandId, channel, name, body, recipientIds wajib" },
      { status: 400 }
    );
  }
  if (channel !== "wa" && channel !== "email") {
    return NextResponse.json({ error: "channel harus 'wa' atau 'email'" }, { status: 400 });
  }
  if (recipientIds.length === 0) {
    return NextResponse.json({ error: "pilih minimal 1 penerima" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // Charge credits
  const actionKey: CreditActionKey =
    channel === "wa" ? "toko.campaign_wa" : "toko.campaign_email";
  const charge = await chargeCredit({ userId, brandId, actionKey });
  if (!charge.ok) {
    return NextResponse.json(
      { error: "credit tidak cukup", reason: charge.reason, balanceAfter: charge.balanceAfter },
      { status: 402 }
    );
  }

  const now = new Date();
  const campaign = await db.campaign.create({
    data: {
      brandId,
      channel,
      name: name.trim(),
      subject: subject?.trim() || null,
      body: campaignBody.trim(),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      sentAt: now,
      status: "sent",
    },
  });

  // Create recipients — simulate send immediately
  await db.campaignRecipient.createMany({
    data: recipientIds.map((r) => ({
      campaignId: campaign.id,
      customerId: r.customerId ?? null,
      leadId: r.leadId ?? null,
      contact: r.contact,
      sent: true,
      deliveredAt: now,
      // Mock open/click: ~60% opened, ~25% clicked
      openedAt: Math.random() < 0.6 ? now : null,
      clickedAt: Math.random() < 0.25 ? now : null,
    })),
  });

  // Re-fetch with stats
  const fresh = await db.campaign.findUnique({
    where: { id: campaign.id },
    include: { _count: { select: { recipients: true } } },
  });
  const sentCount = await db.campaignRecipient.count({
    where: { campaignId: campaign.id, sent: true },
  });
  const openedCount = await db.campaignRecipient.count({
    where: { campaignId: campaign.id, openedAt: { not: null } },
  });
  const clickedCount = await db.campaignRecipient.count({
    where: { campaignId: campaign.id, clickedAt: { not: null } },
  });

  return NextResponse.json({
    campaign: fresh,
    stats: {
      recipientCount: fresh?._count.recipients ?? 0,
      sentCount,
      openedCount,
      clickedCount,
    },
    creditBalanceAfter: charge.balanceAfter,
  });
}

// /api/campaigns/[id] — single campaign with recipients + open/click stats
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      brand: true,
      recipients: {
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { contact: "asc" },
      },
    },
  });
  if (!campaign || campaign.brand.userId !== userId) {
    return NextResponse.json({ error: "campaign tidak ditemukan" }, { status: 404 });
  }

  const total = campaign.recipients.length;
  const sentCount = campaign.recipients.filter((r) => r.sent).length;
  const openedCount = campaign.recipients.filter((r) => r.openedAt).length;
  const clickedCount = campaign.recipients.filter((r) => r.clickedAt).length;
  const deliveredCount = campaign.recipients.filter((r) => r.deliveredAt).length;

  return NextResponse.json({
    campaign: {
      ...campaign,
      brand: undefined, // hide brand internals
    },
    stats: {
      total,
      sentCount,
      deliveredCount,
      openedCount,
      clickedCount,
      openRate: total > 0 ? Math.round((openedCount / total) * 100) : 0,
      clickRate: total > 0 ? Math.round((clickedCount / total) * 100) : 0,
    },
  });
}

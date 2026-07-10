// /api/credit/topup — mock top-up via Doku / mwxmarket
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { packageId, credits, price } = (await req.json()) as {
    packageId: string;
    credits: number;
    price: number;
  };
  if (!credits || credits <= 0) {
    return NextResponse.json({ error: "credits tidak valid" }, { status: 400 });
  }

  // Mock Doku/mwxmarket webhook — instantly add credits
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "user tidak ditemukan" }, { status: 404 });

  const balanceBefore = user.creditBalance;
  const balanceAfter = balanceBefore + Number(credits);
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { creditBalance: balanceAfter } }),
    db.creditUsageLog.create({
      data: {
        userId,
        actionKey: "toko.campaign_wa", // dummy for top-up display
        creditCost: Number(credits),
        balanceBefore,
        balanceAfter,
        referenceId: `topup_${packageId}_${Date.now()}`,
        status: "charged",
      },
    }),
  ]);

  return NextResponse.json({ balance: balanceAfter, packageId, price });
}

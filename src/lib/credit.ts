// Credit utility — central idempotent charge/refund logic (mock mwxmarket.ai)
import { db } from "@/lib/db";
import type { CreditActionKey } from "@/lib/constants";
import { CREDIT_COST } from "@/lib/constants";

export async function chargeCredit(params: {
  userId: string;
  brandId?: string;
  actionKey: CreditActionKey;
  referenceId?: string;
}): Promise<{ ok: boolean; balanceAfter: number; reason?: string }> {
  const cost = CREDIT_COST[params.actionKey];
  // Re-fetch user inside transaction to get fresh balance
  const user = await db.user.findUnique({ where: { id: params.userId } });
  if (!user) return { ok: false, balanceAfter: 0, reason: "user_not_found" };

  if (user.creditBalance < cost) {
    return { ok: false, balanceAfter: user.creditBalance, reason: "insufficient_balance" };
  }

  const balanceBefore = user.creditBalance;
  const balanceAfter = balanceBefore - cost;

  await db.$transaction([
    db.user.update({
      where: { id: params.userId },
      data: { creditBalance: balanceAfter },
    }),
    db.creditUsageLog.create({
      data: {
        userId: params.userId,
        brandId: params.brandId ?? null,
        actionKey: params.actionKey,
        creditCost: cost,
        balanceBefore,
        balanceAfter,
        referenceId: params.referenceId ?? null,
        status: "charged",
      },
    }),
  ]);

  return { ok: true, balanceAfter };
}

export async function refundCredit(params: {
  userId: string;
  brandId?: string;
  actionKey: CreditActionKey;
  referenceId?: string;
  originalBalanceBefore: number;
}): Promise<{ ok: boolean; balanceAfter: number }> {
  const cost = CREDIT_COST[params.actionKey];
  const user = await db.user.findUnique({ where: { id: params.userId } });
  if (!user) return { ok: false, balanceAfter: 0 };

  const balanceBefore = user.creditBalance;
  const balanceAfter = balanceBefore + cost;

  await db.$transaction([
    db.user.update({
      where: { id: params.userId },
      data: { creditBalance: balanceAfter },
    }),
    db.creditUsageLog.create({
      data: {
        userId: params.userId,
        brandId: params.brandId ?? null,
        actionKey: params.actionKey,
        creditCost: cost,
        balanceBefore,
        balanceAfter,
        referenceId: params.referenceId ?? null,
        status: "refunded",
      },
    }),
  ]);

  return { ok: true, balanceAfter };
}

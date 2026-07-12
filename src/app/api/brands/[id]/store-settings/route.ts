// PUT /api/brands/[id]/store-settings — update store settings (auth required)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const brand = await db.brand.findFirst({ where: { id, userId } });
  if (!brand) return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });

  const body = await req.json();
  const { checkoutEnabled, paymentMethods, minOrder, shippingEnabled, bankAccounts } = body;

  const settings = {
    checkoutEnabled: checkoutEnabled ?? true,
    paymentMethods: paymentMethods ?? ["transfer", "cod", "qris"],
    minOrder: minOrder ?? 0,
    shippingEnabled: shippingEnabled ?? false,
    bankAccounts: bankAccounts ?? [],
  };

  await db.brand.update({
    where: { id },
    data: { storeSettings: settings },
  });

  return NextResponse.json({ ok: true, settings });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(_req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const brand = await db.brand.findFirst({
    where: { id, userId },
    select: { storeSettings: true },
  });
  if (!brand) return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });

  const defaults = {
    checkoutEnabled: true,
    paymentMethods: ["transfer", "cod", "qris"],
    minOrder: 0,
    shippingEnabled: false,
    bankAccounts: [] as { bank: string; accountNumber: string; accountName: string }[],
  };

  const stored = (brand.storeSettings ?? {}) as Record<string, unknown>;
  const settings = { ...defaults, ...stored };

  return NextResponse.json({ settings });
}

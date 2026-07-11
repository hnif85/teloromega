// GET /api/init — return session data dari cookie (no auto-create)
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Update lastLogin
  await db.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const brands = await db.brand.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      creditBalance: user.creditBalance,
      toneOfVoice: user.toneOfVoice,
      isOnboarded: user.isOnboarded,
    },
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      description: b.description,
      category: b.category,
      toneOfVoice: b.toneOfVoice,
      isActive: b.isActive,
    })),
    activeBrandId: brands[0]?.id ?? null,
  });
}

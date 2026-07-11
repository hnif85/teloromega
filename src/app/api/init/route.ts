// GET /api/init — auto-create demo user + return session (mock SSO with mwxmarket.ai)
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const email = "ibu.ani@usahaku.ai";
  let user = await db.user.findFirst({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: { email, name: "Ibu Ani", creditBalance: 47 },
    });
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
  }

  // Set cookie (mock JWT) — httpOnly, sameSite lax
  const jar = await cookies();
  jar.set("nw_user_id", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
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

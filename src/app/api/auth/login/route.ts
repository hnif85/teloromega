// POST /api/auth/login — masuk dengan email + password
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { compareSync } from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    // Cari user
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Email tidak ditemukan" }, { status: 401 });
    }

    // Verifikasi password
    const valid = compareSync(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }

    // Update lastLogin
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Set cookie
    const jar = await cookies();
    jar.set("nw_user_id", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
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
      brands,
      activeBrandId: brands[0]?.id ?? null,
    });
  } catch (e: any) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Gagal login. Coba lagi." }, { status: 500 });
  }
}

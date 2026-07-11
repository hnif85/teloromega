// POST /api/auth/register — daftar user baru
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    // Validasi
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, dan nama wajib diisi" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    if (name.length < 2) {
      return NextResponse.json({ error: "Nama minimal 2 karakter" }, { status: 400 });
    }

    // Cek duplikat email
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar. Silakan login." }, { status: 409 });
    }

    // Buat user
    const hashedPassword = hashSync(password, 10);
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        creditBalance: 50, // welcome credit
        toneOfVoice: "santai_ramah",
        isOnboarded: false,
      },
    });

    // Set cookie
    const jar = await cookies();
    jar.set("nw_user_id", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    // Seed credit rates untuk user baru (global rates sudah ada dari seed)
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
    }, { status: 201 });
  } catch (e: any) {
    console.error("Register error:", e);
    return NextResponse.json({ error: "Gagal mendaftar. Coba lagi." }, { status: 500 });
  }
}

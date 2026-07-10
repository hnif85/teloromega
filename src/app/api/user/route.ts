// /api/user — update current user (name, toneOfVoice)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { TONES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { name?: string; toneOfVoice?: string };
  const data: { name?: string; toneOfVoice?: string } = {};

  if (body.name !== undefined) {
    const trimmed = String(body.name).trim();
    if (!trimmed) {
      return NextResponse.json({ error: "name tidak boleh kosong" }, { status: 400 });
    }
    data.name = trimmed.slice(0, 100);
  }

  if (body.toneOfVoice !== undefined) {
    const validKeys = TONES.map((t) => t.key);
    if (!validKeys.includes(body.toneOfVoice as never)) {
      return NextResponse.json({ error: "toneOfVoice tidak valid" }, { status: 400 });
    }
    data.toneOfVoice = body.toneOfVoice;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "tidak ada field untuk diupdate" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      creditBalance: true,
      toneOfVoice: true,
    },
  });

  return NextResponse.json({ user: updated });
}

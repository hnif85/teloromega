// POST /api/auth/logout — keluar + hapus cookie
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const jar = await cookies();
  jar.delete("nw_user_id");

  return NextResponse.json({ ok: true });
}

// POST /api/logout — clear session cookie (mock SSO sign-out)
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  jar.delete("nw_user_id");
  return NextResponse.json({ ok: true });
}

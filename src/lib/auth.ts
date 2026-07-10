// Server-side auth helper — reads userId from cookie (mock SSO with mwxmarket.ai)
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function getUserId(req?: NextRequest): Promise<string | null> {
  // Prefer cookie from next/headers (works in route handlers + server components)
  try {
    const jar = await cookies();
    const c = jar.get("nw_user_id");
    if (c?.value) return c.value;
  } catch {
    /* not in request context */
  }
  if (req) {
    const c = req.cookies.get("nw_user_id");
    if (c?.value) return c.value;
  }
  return null;
}

export async function requireUserId(req?: NextRequest): Promise<string> {
  const id = await getUserId(req);
  if (!id) throw new Error("unauthorized");
  return id;
}

export async function getUser(req?: NextRequest) {
  const id = await getUserId(req);
  if (!id) return null;
  return db.user.findUnique({ where: { id } });
}

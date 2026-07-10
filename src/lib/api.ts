// Typed fetch helper for our REST APIs.
export async function api<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  let body = init?.body;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, {
    ...init,
    headers,
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `Request ${path} failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
      if (err?.message) msg = err.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

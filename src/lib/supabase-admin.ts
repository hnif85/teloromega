// Server-only Supabase client using the service_role key — bypasses Storage
// RLS policies (which key off Supabase Auth's anon/authenticated roles, not
// this app's own getUserId() session system). Only ever import this from
// Route Handlers that already gate on getUserId() themselves; never expose
// SUPABASE_SERVICE_ROLE_KEY via a NEXT_PUBLIC_ var or to client code.
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

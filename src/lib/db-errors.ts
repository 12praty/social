export function friendlyDbError(err: unknown): { message: string; status: number } | null {
  const raw = err instanceof Error ? err.message : String(err);

  // Supabase pooler / Postgres auth misconfiguration commonly shows up as:
  // "FATAL: Tenant or user not found" (wrong pooler host/region or wrong username/password)
  if (/FATAL:\s*Tenant or user not found/i.test(raw)) {
    return {
      status: 503,
      message:
        "Database is not connected. Open `.env` and replace `[PASSWORD]` in DATABASE_URL and DIRECT_URL with your Supabase database password (copy the full Postgres URI from Supabase → Project Settings → Database → Connection string). Then run `npm run db:push` and restart the dev server.",
    };
  }

  if (/password authentication failed/i.test(raw)) {
    return {
      status: 503,
      message:
        "Database password is incorrect. Update DATABASE_URL and DIRECT_URL in `.env` using the Postgres URI from Supabase, then restart the dev server.",
    };
  }

  if (/connect\s+ECONNREFUSED/i.test(raw) || /could not connect to server/i.test(raw)) {
    return {
      status: 503,
      message:
        "Database is unreachable. Check your DATABASE_URL host/port and ensure Supabase is up. If you're using the pooler URL, copy it directly from Supabase → Database settings.",
    };
  }

  if (/P2002/i.test(raw)) {
    return {
      status: 409,
      message: "A record with that value already exists.",
    };
  }

  if (/P2025/i.test(raw)) {
    return {
      status: 404,
      message: "Record not found.",
    };
  }

  return null;
}


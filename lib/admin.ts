import type { User } from "@supabase/supabase-js";

/**
 * Who may see operational data.
 *
 * Kept in an env var rather than the database on purpose: the cost dashboard
 * must stay reachable when something is wrong, including when the thing that is
 * wrong is a bad row in `profiles`.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(user: Pick<User, "email"> | null | undefined): boolean {
  const email = user?.email?.toLowerCase();
  // Fails closed: with ADMIN_EMAILS unset, nobody is an admin.
  return Boolean(email && ADMIN_EMAILS.includes(email));
}

export const ADMIN_CONFIGURED = ADMIN_EMAILS.length > 0;

import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/server/db/client";
import { shippingAddresses } from "@/server/db/schema";
import { verifyCsrf } from "@/server/security/csrf";
import { requireSession } from "@/server/auth/require-session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 });
  }

  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const { id } = await params;

  const [target] = await db
    .select({ id: shippingAddresses.id })
    .from(shippingAddresses)
    .where(and(eq(shippingAddresses.id, id), eq(shippingAddresses.userId, session.userId)))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Exactly one default at a time: unset every other address first, then set this one —
  // never two updates that could race into "no default" or "two defaults" if interrupted
  // between them at the DB level (both run in the same request, sequentially).
  await db
    .update(shippingAddresses)
    .set({ isDefault: false })
    .where(and(eq(shippingAddresses.userId, session.userId), ne(shippingAddresses.id, id)));
  await db.update(shippingAddresses).set({ isDefault: true }).where(eq(shippingAddresses.id, id));

  return NextResponse.json({ ok: true });
}

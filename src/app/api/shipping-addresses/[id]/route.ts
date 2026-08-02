import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { shippingAddresses } from "@/server/db/schema";
import { verifyCsrf } from "@/server/security/csrf";
import { requireSession } from "@/server/auth/require-session";

export async function DELETE(
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

  // Scoped to the session's own userId — never lets a user delete another user's address
  // regardless of what id is requested.
  const deleted = await db
    .delete(shippingAddresses)
    .where(and(eq(shippingAddresses.id, id), eq(shippingAddresses.userId, session.userId)))
    .returning({ id: shippingAddresses.id, wasDefault: shippingAddresses.isDefault });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // If the deleted address was the default, promote the most recently added remaining
  // one so there's always a clear default whenever at least one address exists.
  if (deleted[0].wasDefault) {
    const [nextDefault] = await db
      .select({ id: shippingAddresses.id })
      .from(shippingAddresses)
      .where(eq(shippingAddresses.userId, session.userId))
      .orderBy(shippingAddresses.createdAt)
      .limit(1);
    if (nextDefault) {
      await db
        .update(shippingAddresses)
        .set({ isDefault: true })
        .where(eq(shippingAddresses.id, nextDefault.id));
    }
  }

  return NextResponse.json({ deleted: true });
}

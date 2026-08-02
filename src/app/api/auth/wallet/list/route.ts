import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { walletIdentities } from "@/server/db/schema";
import { requireSession } from "@/server/auth/require-session";

/** Lists the signed-in user's own linked wallet identities — never another user's. */
export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: walletIdentities.id,
      chain: walletIdentities.chain,
      address: walletIdentities.address,
      networkMode: walletIdentities.networkMode,
      isPreferredPayment: walletIdentities.isPreferredPayment,
      verifiedAt: walletIdentities.verifiedAt,
    })
    .from(walletIdentities)
    .where(and(eq(walletIdentities.userId, session.userId), isNull(walletIdentities.revokedAt)));

  return NextResponse.json({ wallets: rows });
}

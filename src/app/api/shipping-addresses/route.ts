import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { shippingAddresses } from "@/server/db/schema";
import { verifyCsrf } from "@/server/security/csrf";
import { encryptField, decryptField } from "@/server/crypto/field-encryption";
import { requireSession } from "@/server/auth/require-session";

/**
 * A user's own shipping addresses — the piece the supplier-purchase worker
 * (src/server/suppliers/purchase-worker.ts) needs on file before it can complete a real
 * purchase. Every free-text field is encrypted at rest (see shippingAddresses schema);
 * `country` stays plaintext since shipping-eligibility queries filter on it.
 */

const addressSchema = z.object({
  fullName: z.string().min(1).max(200),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  stateOrProvince: z.string().max(120).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
  phone: z.string().max(40).optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(shippingAddresses)
    .where(eq(shippingAddresses.userId, session.userId))
    .orderBy(desc(shippingAddresses.isDefault), desc(shippingAddresses.createdAt));

  return NextResponse.json({
    addresses: rows.map((row) => ({
      id: row.id,
      fullName: decryptField(row.fullNameEncrypted),
      line1: decryptField(row.line1Encrypted),
      line2: row.line2Encrypted ? decryptField(row.line2Encrypted) : null,
      city: decryptField(row.cityEncrypted),
      stateOrProvince: row.stateOrProvinceEncrypted
        ? decryptField(row.stateOrProvinceEncrypted)
        : null,
      postalCode: decryptField(row.postalCodeEncrypted),
      country: row.country,
      isDefault: row.isDefault,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "csrf_failed" }, { status: 403 });
  }

  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const body = addressSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: body.error.issues },
      { status: 400 },
    );
  }

  const [existingCount] = await db
    .select({ id: shippingAddresses.id })
    .from(shippingAddresses)
    .where(eq(shippingAddresses.userId, session.userId))
    .limit(1);
  const isFirstAddress = !existingCount;

  const [row] = await db
    .insert(shippingAddresses)
    .values({
      userId: session.userId,
      fullNameEncrypted: encryptField(body.data.fullName),
      line1Encrypted: encryptField(body.data.line1),
      line2Encrypted: body.data.line2 ? encryptField(body.data.line2) : null,
      cityEncrypted: encryptField(body.data.city),
      stateOrProvinceEncrypted: body.data.stateOrProvince
        ? encryptField(body.data.stateOrProvince)
        : null,
      postalCodeEncrypted: encryptField(body.data.postalCode),
      country: body.data.country.toUpperCase(),
      phoneEncrypted: body.data.phone ? encryptField(body.data.phone) : null,
      isDefault: isFirstAddress, // first address on file is always the default
    })
    .returning({ id: shippingAddresses.id });

  return NextResponse.json({ id: row.id, isDefault: isFirstAddress }, { status: 201 });
}
